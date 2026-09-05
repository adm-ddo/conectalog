"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMotoboyComEmpresa } from "@/lib/auth-motoboy";
import { uploadDataUrl } from "@/lib/blob";
import { dataISOBrasil, minutosDesdeMeiaNoiteBrasil } from "@/lib/data";
import type { TurnoPredefinido } from "@/generated/prisma/enums";

export type IniciarTurnoState = { erro?: string } | undefined;

export type DadosIniciarTurno = {
  clienteId: number;
  turnoPredefinido: TurnoPredefinido;
  fotoInicioDataUrl: string;
  assinaturaTermoDataUrl: string;
};

export async function iniciarTurno(dados: DadosIniciarTurno): Promise<IniciarTurnoState> {
  const sessao = await requireMotoboyComEmpresa();

  const motoboy = await prisma.motoboy.findUniqueOrThrow({
    where: { id: sessao.motoboyId },
    select: { livre: true, descontoAssiduidadeAtivo: true },
  });

  if (!motoboy.livre) {
    const liberacao = await prisma.motoboyCliente.findUnique({
      where: { motoboyId_clienteId: { motoboyId: sessao.motoboyId, clienteId: dados.clienteId } },
    });
    if (!liberacao?.liberado) {
      return { erro: "Você não está liberado pra trabalhar nesse cliente." };
    }
  }

  const cliente = await prisma.cliente.findFirst({
    where: { id: dados.clienteId, empresaId: sessao.empresaId, ativo: true },
    include: { taxasExtras: { orderBy: { ordem: "asc" } } },
  });
  if (!cliente) return { erro: "Cliente inválido." };

  // Mesma regra da tela: só aceita um turno predefinido que o cliente tem
  // ativado no cadastro dele — "Livre" nunca tem esse tipo de trava (ver
  // comentário do enum TurnoPredefinido). Redundante com o filtro que já
  // esconde as opções no wizard, mas o app do motoboy nunca deve confiar
  // só no que o cliente (navegador) mandou.
  const ATIVO_POR_TURNO: Record<TurnoPredefinido, boolean> = {
    MANHA: cliente.turnoManhaAtivo,
    TARDE: cliente.turnoTardeAtivo,
    NOITE: cliente.turnoNoiteAtivo,
    LIVRE: true,
  };
  if (!ATIVO_POR_TURNO[dados.turnoPredefinido]) {
    return { erro: "Esse turno não está disponível pra esse cliente." };
  }

  const jaEmTurno = await prisma.turno.findFirst({
    where: { motoboyId: sessao.motoboyId, status: "ABERTO" },
  });
  if (jaEmTurno) return { erro: "Você já está com um turno em aberto." };

  if (!dados.fotoInicioDataUrl || !dados.assinaturaTermoDataUrl) {
    return { erro: "Falta a foto ou a assinatura." };
  }

  const [fotoInicioUrl, assinaturaTermoUrl] = await Promise.all([
    uploadDataUrl(`turnos/foto-inicio-${Date.now()}.jpg`, dados.fotoInicioDataUrl),
    uploadDataUrl(`turnos/assinatura-termo-${Date.now()}.png`, dados.assinaturaTermoDataUrl),
  ]);

  // As faixas de taxa extra do Cliente viram um "slot" (quantidade 0) já
  // no início do turno, não só no fechamento — o cliente pode encerrar e
  // avaliar pelo portal antes do motoboy encerrar o turno dele (só
  // precisa estar escalado/check-in feito), então o item já precisa
  // existir pros dois lados poderem preencher a quantidade, em qualquer
  // ordem. O preço também fica travado nesse momento (snapshot), igual
  // já acontece com valorBandaAplicado.
  let turno;
  try {
    turno = await prisma.turno.create({
      data: {
        motoboyId: sessao.motoboyId,
        clienteId: dados.clienteId,
        turnoPredefinido: dados.turnoPredefinido,
        fotoInicioUrl,
        assinaturaTermoUrl,
        taxaExtraItens: {
          create: cliente.taxasExtras.map((faixa) => ({
            clienteTaxaExtraId: faixa.id,
            ordem: faixa.ordem,
            descricao: faixa.descricao,
            valorMotoboyAplicado: faixa.valorMotoboy,
            valorClienteAplicado: faixa.valorCliente,
          })),
        },
      },
    });
  } catch {
    // A checagem de jaEmTurno acima não impede duas requisições quase
    // simultâneas (cliques repetidos, rede lenta) de passarem juntas —
    // quem garante de verdade é o índice único parcial no banco
    // (Turno_motoboyId_aberto_unico, só um ABERTO por motoboy). Cair
    // aqui só acontece se esbarrar nele.
    return { erro: "Você já está com um turno em aberto." };
  }

  await Promise.all([
    vincularEscalaSeExistir(sessao.motoboyId, dados.clienteId, dados.turnoPredefinido, turno.id),
    registrarDescontoAssiduidadeSeAtrasado(
      motoboy.descontoAssiduidadeAtivo,
      sessao.motoboyId,
      sessao.empresaId,
      turno.id,
      cliente,
      dados.turnoPredefinido
    ),
  ]);

  redirect("/app/inicio");
}

/** Se a cooperativa escalou esse motoboy pra esse cliente hoje, liga a
 * escala a esse Turno — é isso que faz o card virar verde no portal do
 * cliente e no painel. Tenta primeiro achar a escala do mesmo turno
 * (manhã/tarde/noite) que o motoboy escolheu; se ele entrou como "livre"
 * ou não bateu com nenhuma, tenta qualquer escala do dia ainda sem turno
 * vinculado (evita perder o vínculo por causa de uma pequena diferença
 * de rótulo). Não bloqueia nada se não achar — apoio ao vivo sem escala
 * prévia é normal e esperado.
 *
 * Já aproveita e confirma a escala (statusConfirmacao=CONFIRMADO) — bater
 * o ponto de verdade é a prova mais forte possível de que ele "vai poder
 * ir" (é o próprio ir acontecendo), mais forte até que ter tocado
 * "Confirmar" antes. Sobrescreve mesmo se ele tinha respondido RECUSADO
 * antes (mudou de ideia e apareceu mesmo assim) — pedido do Thiago pra
 * não deixar a escala presa em "pendente"/"recusado" com o motoboy
 * fisicamente lá dentro do cliente. */
async function vincularEscalaSeExistir(
  motoboyId: number,
  clienteId: number,
  turnoPredefinido: TurnoPredefinido,
  turnoId: number
) {
  const hoje = new Date(dataISOBrasil());

  const escala =
    turnoPredefinido !== "LIVRE"
      ? await prisma.escalaTurno.findFirst({
          where: { clienteId, motoboyId, data: hoje, turno: turnoPredefinido, turnoId: null },
        })
      : null;

  const escalaFinal =
    escala ??
    (await prisma.escalaTurno.findFirst({
      where: { clienteId, motoboyId, data: hoje, turnoId: null },
      orderBy: { turno: "asc" },
    }));

  if (escalaFinal) {
    await prisma.escalaTurno.update({
      where: { id: escalaFinal.id },
      data: { turnoId, statusConfirmacao: "CONFIRMADO", confirmadoEm: new Date() },
    });
  }
}

const CAMPO_HORARIO_INICIO = {
  MANHA: "turnoManhaInicio",
  TARDE: "turnoTardeInicio",
  NOITE: "turnoNoiteInicio",
} as const;

/** Desconto automático de assiduidade: se o motoboy tem o checkbox ligado
 * e chega `toleranciaAtrasoMinutos` (configurável, ver /configuracoes) ou
 * mais depois do horário que o Cliente tem configurado pra esse turno,
 * cria um desconto no valor daquele turno (manhã/tarde/noite, cada um com
 * seu próprio valor) — aplicado automaticamente no próximo pagamento
 * fechado (ver fecharPagamento). "Livre" nunca gera desconto: não tem um
 * horário de referência pra comparar. */
async function registrarDescontoAssiduidadeSeAtrasado(
  descontoAtivo: boolean,
  motoboyId: number,
  empresaId: number,
  turnoId: number,
  cliente: { turnoManhaInicio: string | null; turnoTardeInicio: string | null; turnoNoiteInicio: string | null },
  turnoPredefinido: TurnoPredefinido
) {
  if (!descontoAtivo || turnoPredefinido === "LIVRE") return;

  const horarioInicio = cliente[CAMPO_HORARIO_INICIO[turnoPredefinido]];
  if (!horarioInicio) return;

  const partes = horarioInicio.split(":").map(Number);
  if (partes.length !== 2 || partes.some(Number.isNaN)) return;
  const minutosAgendados = partes[0] * 60 + partes[1];
  const minutosAgora = minutosDesdeMeiaNoiteBrasil();

  let atraso = minutosAgora - minutosAgendados;
  if (atraso < -12 * 60) atraso += 24 * 60; // turno cruzou meia-noite entre o horário marcado e agora

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: empresaId },
    select: {
      toleranciaAtrasoMinutos: true,
      valorDescontoAtrasoManha: true,
      valorDescontoAtrasoTarde: true,
      valorDescontoAtrasoNoite: true,
    },
  });

  if (atraso < empresa.toleranciaAtrasoMinutos) return;

  const valorPorTurno = {
    MANHA: empresa.valorDescontoAtrasoManha,
    TARDE: empresa.valorDescontoAtrasoTarde,
    NOITE: empresa.valorDescontoAtrasoNoite,
  } as const;

  await prisma.descontoAssiduidade.create({
    data: {
      turnoId,
      motoboyId,
      minutosAtraso: atraso,
      valorDesconto: valorPorTurno[turnoPredefinido],
    },
  });
}

"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMotoboy } from "@/lib/auth-motoboy";
import { uploadDataUrl } from "@/lib/blob";
import type { TurnoPredefinido } from "@/generated/prisma/enums";

export type IniciarTurnoState = { erro?: string } | undefined;

export type DadosIniciarTurno = {
  clienteId: number;
  turnoPredefinido: TurnoPredefinido;
  fotoInicioDataUrl: string;
  assinaturaTermoDataUrl: string;
};

export async function iniciarTurno(dados: DadosIniciarTurno): Promise<IniciarTurnoState> {
  const sessao = await requireMotoboy();

  const motoboy = await prisma.motoboy.findUniqueOrThrow({
    where: { id: sessao.motoboyId },
    select: { livre: true },
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
  const turno = await prisma.turno.create({
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

  await vincularEscalaSeExistir(sessao.motoboyId, dados.clienteId, dados.turnoPredefinido, turno.id);

  redirect("/app/inicio");
}

/** Se a cooperativa escalou esse motoboy pra esse cliente hoje, liga a
 * escala a esse Turno — é isso que faz o card virar verde no portal do
 * cliente e no painel. Tenta primeiro achar a escala do mesmo turno
 * (manhã/noite) que o motoboy escolheu; se ele entrou como "livre" ou
 * não bateu com nenhuma, tenta qualquer escala do dia ainda sem turno
 * vinculado (evita perder o vínculo por causa de uma pequena diferença
 * de rótulo). Não bloqueia nada se não achar — apoio ao vivo sem escala
 * prévia é normal e esperado. */
async function vincularEscalaSeExistir(
  motoboyId: number,
  clienteId: number,
  turnoPredefinido: TurnoPredefinido,
  turnoId: number
) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

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
    await prisma.escalaTurno.update({ where: { id: escalaFinal.id }, data: { turnoId } });
  }
}

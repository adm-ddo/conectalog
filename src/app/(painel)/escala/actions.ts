"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenant, clientesResponsaveisIds } from "@/lib/auth-empresa";
import { LABEL_TURNO } from "@/lib/equipe";
import { instanteBrasil } from "@/lib/data";
import type { TurnoEscala } from "@/generated/prisma/enums";

/** Formata a data (Date @db.Date, sem fuso relevante) como dd/mm — usado
 * só na mensagem da notificação. */
function dataCurta(data: Date): string {
  const dia = String(data.getUTCDate()).padStart(2, "0");
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}`;
}

/** Meia-noite de Brasília (como instante de verdade) do dia que essa
 * Date @db.Date representa — usa getUTC* de propósito (mesmo motivo de
 * dataCurta acima): um valor @db.Date não tem fuso, então lê os campos
 * UTC do Date pra não vazar 1 dia por causa da conversão de fuso do
 * helper genérico (inicioDoDiaBrasil espera um INSTANTE de verdade, não
 * um valor de calendário puro). */
function inicioDoDiaBrasilDeDataCalendario(data: Date): Date {
  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = `${data.getUTCFullYear()}-${pad(data.getUTCMonth() + 1)}-${pad(data.getUTCDate())}`;
  return instanteBrasil(iso);
}

/** Avisa o motoboy dentro do app que ele foi escalado — hoje só no app;
 * "futuramente vamos colocar um aviso por email" (pedido do Thiago) é só
 * adicionar um envio aqui depois, a notificação já existe pra isso.
 * Carrega o escalaId pra dar pra confirmar/recusar direto no banner da
 * notificação, sem precisar ir em "Minha escala" (pedido do Thiago). */
async function avisarEscalado(
  motoboyId: number,
  clienteNome: string,
  data: Date,
  turno: TurnoEscala,
  escalaId: number
) {
  await prisma.notificacao.create({
    data: {
      motoboyId,
      tipo: "ESCALADO",
      escalaId,
      mensagem: `Você foi escalado em ${clienteNome} no turno da ${LABEL_TURNO[turno]} de ${dataCurta(data)}. Confirma que vai poder ir?`,
    },
  });
}

/** Cria a escala se ainda não existir e avisa o motoboy — não faz nada
 * (nem re-notifica) se ele já estava escalado ali, porque upsert nesse
 * caso é só um clique repetido/idempotente. */
async function escalarSeNovo(
  clienteId: number,
  motoboyId: number,
  data: Date,
  turno: TurnoEscala,
  clienteNome: string,
  criadoPorUsuarioId: number
) {
  const jaExiste = await prisma.escalaTurno.findUnique({
    where: { clienteId_motoboyId_data_turno: { clienteId, motoboyId, data, turno } },
  });
  if (jaExiste) return;

  // Se o motoboy já está com um turno ABERTO nesse cliente HOJE (ex.:
  // entrou como "livre"/apoio antes de alguém montar a escala do dia — a
  // cooperativa às vezes só formaliza a escala depois de já ver quem
  // apareceu), a escala nasce já vinculada, senão o portal do cliente
  // continua achando que ele "ainda não chegou" mesmo estando lá desde
  // antes. Espelha vincularEscalaSeExistir (turno/iniciar/actions.ts),
  // que faz o link no sentido contrário (turno já existe, escala chega
  // depois — aqui é o inverso).
  //
  // horaInicio filtrado a partir da meia-noite do dia da escala é
  // crítico: sem isso, um turno de ONTEM que o motoboy esqueceu de
  // encerrar (ainda ABERTO na hora em que essa escala de HOJE é criada)
  // fica linkado errado — foi exatamente o que aconteceu com o Luciano
  // (turno de ontem só fechou às 15:59 de hoje, minutos depois da escala
  // de hoje ter sido criada e pego ele "por acidente").
  const turnoAbertoNesseCliente = await prisma.turno.findFirst({
    where: {
      motoboyId,
      clienteId,
      status: "ABERTO",
      horaInicio: { gte: inicioDoDiaBrasilDeDataCalendario(data) },
    },
  });

  const escala = await prisma.escalaTurno.create({
    data: {
      clienteId,
      motoboyId,
      data,
      turno,
      criadoPorUsuarioId,
      turnoId: turnoAbertoNesseCliente?.id,
      // Se já tem um turno aberto pra linkar, ele já está lá trabalhando
      // — mesma lógica de vincularEscalaSeExistir (turno/iniciar/
      // actions.ts): bater o ponto de verdade conta como confirmação,
      // mais forte que qualquer clique de "Confirmar".
      ...(turnoAbertoNesseCliente ? { statusConfirmacao: "CONFIRMADO", confirmadoEm: new Date() } : {}),
    },
  });
  await avisarEscalado(motoboyId, clienteNome, data, turno, escala.id);
}

export async function escalarMotoboy(
  clienteId: number,
  motoboyId: number,
  data: string,
  turno: TurnoEscala
) {
  const sessao = await requireTenant();
  const idsResponsaveis = await clientesResponsaveisIds(sessao);
  if (sessao.role === "GESTOR_CAMPO" && !idsResponsaveis.includes(clienteId)) return;

  const [cliente, motoboy] = await Promise.all([
    prisma.cliente.findFirst({ where: { id: clienteId, empresaId: sessao.empresaEfetivoId } }),
    prisma.motoboy.findFirst({ where: { id: motoboyId, empresaId: sessao.empresaEfetivoId } }),
  ]);
  if (!cliente || !motoboy) return;

  await escalarSeNovo(clienteId, motoboyId, new Date(data), turno, cliente.nome, sessao.usuarioId);

  revalidatePath("/escala");
}

export async function removerEscala(escalaId: number) {
  const sessao = await requireTenant();
  const idsResponsaveis = await clientesResponsaveisIds(sessao);
  await prisma.escalaTurno.deleteMany({
    where: {
      id: escalaId,
      cliente: {
        empresaId: sessao.empresaEfetivoId,
        ...(sessao.role === "GESTOR_CAMPO" ? { id: { in: idsResponsaveis } } : {}),
      },
    },
  });
  revalidatePath("/escala");
}

/** "Manter a última escala": copia quem estava escalado na mesma data da
 * semana passada (mesmo cliente+turno) pra data de hoje — pedido do
 * Thiago pra não ter que remontar a escala toda toda semana quando o
 * padrão se repete. Já avisa cada motoboy copiado. */
export async function manterEscalaSemanaPassada(
  clienteId: number,
  turno: TurnoEscala,
  data: string
) {
  const sessao = await requireTenant();
  const idsResponsaveis = await clientesResponsaveisIds(sessao);
  if (sessao.role === "GESTOR_CAMPO" && !idsResponsaveis.includes(clienteId)) return;

  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, empresaId: sessao.empresaEfetivoId },
  });
  if (!cliente) return;

  const [ano, mes, dia] = data.split("-").map(Number);
  const dataDestino = new Date(data);
  const dataOrigem = new Date(Date.UTC(ano, mes - 1, dia - 7));

  const escalasAnteriores = await prisma.escalaTurno.findMany({
    where: { clienteId, turno, data: dataOrigem },
    select: { motoboyId: true },
  });

  for (const { motoboyId } of escalasAnteriores) {
    await escalarSeNovo(clienteId, motoboyId, dataDestino, turno, cliente.nome, sessao.usuarioId);
  }

  revalidatePath("/escala");
}

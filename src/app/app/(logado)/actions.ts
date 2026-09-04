"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { destruirSessaoMotoboyAtual, requireMotoboy } from "@/lib/auth-motoboy";

export async function sairMotoboy() {
  await destruirSessaoMotoboyAtual();
  redirect("/app/entrar");
}

export type AcaoCooperativaResult = { erro?: string } | undefined;

/** Motoboy "na prateleira" (sem cooperativa, ver Motoboy.empresaId) pede
 * vaga numa cooperativa — fica pendente até ela aprovar. Só faz sentido
 * quando ele ainda não está vinculado a nenhuma (pra trocar, primeiro sai
 * da atual com sairDaCooperativaMotoboy). */
export async function escolherCooperativaMotoboy(
  empresaId: number
): Promise<AcaoCooperativaResult> {
  const sessao = await requireMotoboy();
  if (sessao.empresaId !== null) {
    return { erro: "Você já está vinculado (ou com pedido pendente) numa cooperativa." };
  }

  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) return { erro: "Cooperativa inválida." };

  await prisma.motoboy.update({
    where: { id: sessao.motoboyId },
    data: { empresaId, aprovadoEm: null, livre: false },
  });
  revalidatePath("/", "layout");
}

/** Cancela um pedido pendente OU sai de uma cooperativa já aprovada — nos
 * dois casos volta "pra prateleira" (empresaId null), disponível pra
 * qualquer cooperativa chamar ou pra ele pedir vaga em outra. Bloqueado
 * com turno em aberto: sair no meio do turno bagunçaria o fechamento
 * (pra quem cobrar, quem pagar). */
export async function sairDaCooperativaMotoboy(): Promise<AcaoCooperativaResult> {
  const sessao = await requireMotoboy();
  if (sessao.empresaId === null) return;

  const turnoAberto = await prisma.turno.findFirst({
    where: { motoboyId: sessao.motoboyId, status: "ABERTO" },
  });
  if (turnoAberto) {
    return { erro: "Encerre o turno em andamento antes de sair da cooperativa." };
  }

  await prisma.motoboy.update({
    where: { id: sessao.motoboyId },
    data: { empresaId: null, aprovadoEm: null, livre: false },
  });
  revalidatePath("/", "layout");
}

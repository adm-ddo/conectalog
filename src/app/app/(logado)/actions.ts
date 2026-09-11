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

  // visivelParaCadastro também vale aqui, não só na lista — esconder da
  // tela e ainda aceitar por um id direto não faria sentido.
  const empresa = await prisma.empresa.findFirst({
    where: { id: empresaId, visivelParaCadastro: true },
  });
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

/** Guarda a inscrição de push desse aparelho — chamado do client depois
 * que o navegador já criou a PushSubscription (permissão concedida,
 * service worker registrado). upsert pelo endpoint porque o mesmo
 * aparelho pode reativar depois de ter desativado, ou o motoboy trocar
 * de conta no mesmo navegador. */
export async function inscreverPush(inscricao: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const sessao = await requireMotoboy();
  await prisma.pushSubscription.upsert({
    where: { endpoint: inscricao.endpoint },
    update: { motoboyId: sessao.motoboyId, p256dh: inscricao.keys.p256dh, auth: inscricao.keys.auth },
    create: {
      motoboyId: sessao.motoboyId,
      endpoint: inscricao.endpoint,
      p256dh: inscricao.keys.p256dh,
      auth: inscricao.keys.auth,
    },
  });
}

/** Remove a inscrição desse aparelho (motoboy desativou manualmente, ou
 * o client detectou que a permissão foi revogada). Escopado ao próprio
 * motoboy — não apaga inscrição de outro por engano/malícia. */
export async function removerInscricaoPush(endpoint: string) {
  const sessao = await requireMotoboy();
  await prisma.pushSubscription.deleteMany({
    where: { endpoint, motoboyId: sessao.motoboyId },
  });
}

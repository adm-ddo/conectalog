"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMotoboy } from "@/lib/auth-motoboy";
import type { StatusConfirmacaoEscala } from "@/generated/prisma/enums";

export async function marcarNotificacaoLida(notificacaoId: number) {
  const sessao = await requireMotoboy();
  await prisma.notificacao.updateMany({
    where: { id: notificacaoId, motoboyId: sessao.motoboyId },
    data: { lida: true },
  });
  revalidatePath("/app/inicio");
}

/** Confirma/recusa a escala e já marca a notificação como lida junto —
 * evita o motoboy ter que ir em "Minha escala" só pra responder o que já
 * apareceu pra ele no banner da home. */
export async function responderNotificacaoEscala(
  notificacaoId: number,
  escalaId: number,
  resposta: StatusConfirmacaoEscala
) {
  const sessao = await requireMotoboy();
  await prisma.$transaction([
    prisma.escalaTurno.updateMany({
      where: { id: escalaId, motoboyId: sessao.motoboyId },
      data: { statusConfirmacao: resposta, confirmadoEm: new Date() },
    }),
    prisma.notificacao.updateMany({
      where: { id: notificacaoId, motoboyId: sessao.motoboyId },
      data: { lida: true },
    }),
  ]);
  revalidatePath("/app/inicio");
  revalidatePath("/app/escala");
}

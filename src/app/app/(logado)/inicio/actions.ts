"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMotoboy } from "@/lib/auth-motoboy";

export async function marcarNotificacaoLida(notificacaoId: number) {
  const sessao = await requireMotoboy();
  await prisma.notificacao.updateMany({
    where: { id: notificacaoId, motoboyId: sessao.motoboyId },
    data: { lida: true },
  });
  revalidatePath("/app/inicio");
}

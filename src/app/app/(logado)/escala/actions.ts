"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMotoboy } from "@/lib/auth-motoboy";
import type { StatusConfirmacaoEscala } from "@/generated/prisma/enums";

/** Motoboy confirma ou recusa uma escala que a cooperativa marcou pra ele
 * — livre pra mudar de ideia quantas vezes quiser antes do turno (não é
 * um voto único). Não mexe em turnoId nem no turno de verdade, só no
 * status de resposta que o dashboard da cooperativa usa. */
export async function responderEscala(escalaId: number, resposta: StatusConfirmacaoEscala) {
  const sessao = await requireMotoboy();
  await prisma.escalaTurno.updateMany({
    where: { id: escalaId, motoboyId: sessao.motoboyId },
    data: { statusConfirmacao: resposta, confirmadoEm: new Date() },
  });
  revalidatePath("/escala");
}

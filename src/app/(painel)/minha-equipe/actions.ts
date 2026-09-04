"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenant, clientesResponsaveisIds } from "@/lib/auth-empresa";

/** Liga/desliga um motoboy da equipe de um cliente que o Gestor de campo
 * é responsável — mesma ideia de alternarLiberacaoMotoboyCliente em
 * motoboys/actions.ts, só que essa versão só existe pro Gestor de campo e
 * é travada nos clientes dele (nunca mexe em liberação de cliente fora
 * do que ele responde). */
export async function alternarLiberacaoEquipe(
  clienteId: number,
  motoboyId: number,
  liberado: boolean
) {
  const sessao = await requireTenant();
  if (sessao.role !== "GESTOR_CAMPO") return;

  const idsResponsaveis = await clientesResponsaveisIds(sessao);
  if (!idsResponsaveis.includes(clienteId)) return;

  const motoboy = await prisma.motoboy.findFirst({
    where: { id: motoboyId, empresaId: sessao.empresaEfetivoId },
  });
  if (!motoboy) return;

  await prisma.motoboyCliente.upsert({
    where: { motoboyId_clienteId: { motoboyId, clienteId } },
    update: { liberado },
    create: { motoboyId, clienteId, liberado },
  });

  revalidatePath("/minha-equipe");
}

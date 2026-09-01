"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth-empresa";
import type { TurnoEscala } from "@/generated/prisma/enums";

export async function escalarMotoboy(
  clienteId: number,
  motoboyId: number,
  data: string,
  turno: TurnoEscala
) {
  const sessao = await requireTenant();

  const [cliente, motoboy] = await Promise.all([
    prisma.cliente.findFirst({ where: { id: clienteId, empresaId: sessao.empresaEfetivoId } }),
    prisma.motoboy.findFirst({ where: { id: motoboyId, empresaId: sessao.empresaEfetivoId } }),
  ]);
  if (!cliente || !motoboy) return;

  await prisma.escalaTurno.upsert({
    where: { clienteId_motoboyId_data_turno: { clienteId, motoboyId, data: new Date(data), turno } },
    update: {},
    create: {
      clienteId,
      motoboyId,
      data: new Date(data),
      turno,
      criadoPorUsuarioId: sessao.usuarioId,
    },
  });

  revalidatePath("/escala");
}

export async function removerEscala(escalaId: number) {
  const sessao = await requireTenant();
  await prisma.escalaTurno.deleteMany({
    where: { id: escalaId, cliente: { empresaId: sessao.empresaEfetivoId } },
  });
  revalidatePath("/escala");
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/auth-empresa";
import type { TurnoEscala } from "@/generated/prisma/enums";

export async function escalarMotoboy(
  clienteId: number,
  motoboyId: number,
  data: string,
  turno: TurnoEscala
) {
  const sessao = await requireEmpresa();

  const [cliente, motoboy] = await Promise.all([
    prisma.cliente.findFirst({ where: { id: clienteId, empresaId: sessao.empresaId } }),
    prisma.motoboy.findFirst({ where: { id: motoboyId, empresaId: sessao.empresaId } }),
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
  const sessao = await requireEmpresa();
  await prisma.escalaTurno.deleteMany({
    where: { id: escalaId, cliente: { empresaId: sessao.empresaId } },
  });
  revalidatePath("/escala");
}

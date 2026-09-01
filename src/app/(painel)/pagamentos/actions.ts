"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/auth-empresa";

/** Junta todo turno CONCLUIDO (e seus apoios) ainda sem pagamento vinculado
 * pra esse motoboy num Pagamento novo, status PENDENTE — o PIX em si a
 * cooperativa faz pelo banco dela; isso aqui é só o fechamento de conta.
 * Mesmo espírito do extras-app: nunca calcula/envia dinheiro sozinho. */
export async function fecharPagamento(motoboyId: number) {
  const sessao = await requireEmpresa();

  const motoboy = await prisma.motoboy.findFirst({
    where: { id: motoboyId, empresaId: sessao.empresaId },
  });
  if (!motoboy) return;

  const turnos = await prisma.turno.findMany({
    where: { motoboyId, status: "CONCLUIDO", pagamentoId: null },
    include: { apoios: { where: { pagamentoId: null } } },
  });
  if (turnos.length === 0) return;

  let valorTotal = 0;
  let periodoInicio = turnos[0].horaInicio;
  let periodoFim = turnos[0].horaInicio;
  const turnoIds: number[] = [];
  const apoioIds: number[] = [];

  for (const turno of turnos) {
    valorTotal += Number(turno.valorTotal ?? 0);
    turnoIds.push(turno.id);
    if (turno.horaInicio < periodoInicio) periodoInicio = turno.horaInicio;
    if (turno.horaInicio > periodoFim) periodoFim = turno.horaInicio;
    for (const apoio of turno.apoios) {
      valorTotal += Number(apoio.valorTotal);
      apoioIds.push(apoio.id);
    }
  }

  await prisma.$transaction(async (tx) => {
    const pagamento = await tx.pagamento.create({
      data: { motoboyId, empresaId: sessao.empresaId, periodoInicio, periodoFim, valorTotal },
    });
    await tx.turno.updateMany({
      where: { id: { in: turnoIds } },
      data: { pagamentoId: pagamento.id },
    });
    if (apoioIds.length > 0) {
      await tx.apoio.updateMany({
        where: { id: { in: apoioIds } },
        data: { pagamentoId: pagamento.id },
      });
    }
  });

  revalidatePath("/pagamentos");
}

export async function marcarPagamentoPago(pagamentoId: number) {
  const sessao = await requireEmpresa();

  const pagamento = await prisma.pagamento.findFirst({
    where: { id: pagamentoId, empresaId: sessao.empresaId },
  });
  if (!pagamento) return;

  await prisma.$transaction([
    prisma.pagamento.update({
      where: { id: pagamentoId },
      data: { status: "CONCLUIDO", pagoEm: new Date() },
    }),
    prisma.turno.updateMany({ where: { pagamentoId }, data: { status: "PAGO" } }),
  ]);

  revalidatePath("/pagamentos");
}

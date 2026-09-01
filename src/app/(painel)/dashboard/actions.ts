"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/auth-empresa";
import type { StatusSolicitacaoApoio } from "@/generated/prisma/enums";

export async function responderSolicitacaoApoio(
  solicitacaoId: number,
  status: Extract<StatusSolicitacaoApoio, "A_CAMINHO" | "SEM_MOTO">
) {
  const sessao = await requireEmpresa();
  await prisma.solicitacaoApoio.updateMany({
    where: { id: solicitacaoId, cliente: { empresaId: sessao.empresaId }, status: "PENDENTE" },
    data: { status, respondidoPorUsuarioId: sessao.usuarioId, respondidoEm: new Date() },
  });
  revalidatePath("/dashboard");
}

/** Resolve manualmente uma divergência entre o que o motoboy informou e
 * o que o cliente informou — a cooperativa entra em acordo com os dois
 * lados e define aqui a quantidade final, que passa a valer pro
 * pagamento (recalcula valorTotal/valorCobradoCliente). */
export async function resolverDivergenciaTurno(
  turnoId: number,
  quantidadeBandasFinal: number,
  quantidadeTaxasExtrasFinal: number
) {
  const sessao = await requireEmpresa();

  const turno = await prisma.turno.findFirst({
    where: { id: turnoId, motoboy: { empresaId: sessao.empresaId } },
    include: { cliente: true },
  });
  if (!turno) return;

  const { calcularValores } = await import("@/lib/precificacao");
  const empresa = await prisma.empresa.findUniqueOrThrow({ where: { id: sessao.empresaId } });
  const { valorMotoboy, valorCliente } = calcularValores(
    turno.cliente,
    empresa,
    quantidadeBandasFinal,
    quantidadeTaxasExtrasFinal
  );

  await prisma.turno.update({
    where: { id: turnoId },
    data: {
      quantidadeBandas: quantidadeBandasFinal,
      quantidadeTaxasExtras: quantidadeTaxasExtrasFinal,
      valorTotal: valorMotoboy,
      valorCobradoCliente: valorCliente,
      resolvidoDivergenciaEm: new Date(),
    },
  });

  revalidatePath("/dashboard");
}

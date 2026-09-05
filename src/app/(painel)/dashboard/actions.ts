"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenant, clientesResponsaveisIds } from "@/lib/auth-empresa";
import type { StatusSolicitacaoApoio } from "@/generated/prisma/enums";

export async function responderSolicitacaoApoio(
  solicitacaoId: number,
  status: Extract<StatusSolicitacaoApoio, "A_CAMINHO" | "SEM_MOTO">
) {
  const sessao = await requireTenant();
  // Gestor de campo só decide sobre solicitações dos clientes dele —
  // mesmo cuidado do dashboard, que já só mostra essas (defesa em
  // profundidade, caso o id venha de fora da tela).
  const idsResponsaveis = await clientesResponsaveisIds(sessao);
  await prisma.solicitacaoApoio.updateMany({
    where: {
      id: solicitacaoId,
      cliente: {
        empresaId: sessao.empresaEfetivoId,
        ...(sessao.role === "GESTOR_CAMPO" ? { id: { in: idsResponsaveis } } : {}),
      },
      status: "PENDENTE",
    },
    data: { status, respondidoPorUsuarioId: sessao.usuarioId, respondidoEm: new Date() },
  });
  revalidatePath("/dashboard");
}

/** Resolve manualmente uma divergência entre o que o motoboy informou e
 * o que o cliente informou — a cooperativa entra em acordo com os dois
 * lados e define aqui a quantidade final de bandas e de cada faixa de
 * taxa extra, que passa a valer pro pagamento (recalcula valorTotal/
 * valorCobradoCliente). O número original do motoboy é guardado antes de
 * ser sobrescrito (o do cliente já fica preservado em
 * quantidadeBandasCliente/quantidadeCliente, que nunca mudam), junto com
 * quem resolveu e uma observação livre opcional — registro permanente de
 * que a disputa foi resolvida em comum acordo, não decidida sozinha. */
export async function resolverDivergenciaTurno(
  turnoId: number,
  quantidadeBandasFinal: number,
  taxasExtrasFinais: { itemId: number; quantidade: number }[],
  observacao: string
) {
  const sessao = await requireTenant();
  const idsResponsaveis = await clientesResponsaveisIds(sessao);

  const turno = await prisma.turno.findFirst({
    where: {
      id: turnoId,
      motoboy: { empresaId: sessao.empresaEfetivoId },
      ...(sessao.role === "GESTOR_CAMPO" ? { clienteId: { in: idsResponsaveis } } : {}),
    },
    include: {
      cliente: { include: { turnosFixos: true } },
      taxaExtraItens: true,
      motoboy: { select: { ehGestor: true, modoRemuneracaoGestor: true, valorBandaGestorEspecial: true } },
    },
  });
  if (!turno) return;

  const idsDoTurno = new Set(turno.taxaExtraItens.map((item) => item.id));
  const itensValidos = taxasExtrasFinais.filter((t) => idsDoTurno.has(t.itemId));

  const { calcularValores, aplicarRemuneracaoGestor } = await import("@/lib/precificacao");
  const empresa = await prisma.empresa.findUniqueOrThrow({ where: { id: sessao.empresaEfetivoId } });
  const { valorMotoboy, valorCliente } = calcularValores(
    turno.cliente,
    empresa,
    turno.horaInicio,
    turno.turnoPredefinido,
    quantidadeBandasFinal,
    turno.taxaExtraItens.map((item) => ({
      valorMotoboy: item.valorMotoboyAplicado,
      valorCliente: item.valorClienteAplicado,
      quantidade: itensValidos.find((t) => t.itemId === item.id)?.quantidade ?? item.quantidade,
    }))
  );
  const totalTaxasExtras = itensValidos.reduce((soma, t) => soma + t.quantidade, 0);
  // Mesma regra do encerramento normal — a cobrança do cliente
  // (valorCliente) nunca muda por causa disso, só o que o Gestor recebe.
  const totalTaxasMotoboy = turno.taxaExtraItens.reduce((soma, item) => {
    const quantidade = itensValidos.find((t) => t.itemId === item.id)?.quantidade ?? item.quantidade;
    return soma + quantidade * Number(item.valorMotoboyAplicado);
  }, 0);
  const valorMotoboyFinal =
    aplicarRemuneracaoGestor(valorMotoboy - totalTaxasMotoboy, quantidadeBandasFinal, turno.motoboy) +
    totalTaxasMotoboy;

  await prisma.$transaction([
    prisma.turno.update({
      where: { id: turnoId },
      data: {
        quantidadeBandas: quantidadeBandasFinal,
        quantidadeTaxasExtras: totalTaxasExtras,
        valorTotal: valorMotoboyFinal,
        valorCobradoCliente: valorCliente,
        quantidadeBandasMotoboyOriginal: turno.quantidadeBandas,
        resolvidoPorUsuarioId: sessao.usuarioId,
        observacaoDivergencia: observacao.trim() || null,
        resolvidoDivergenciaEm: new Date(),
      },
    }),
    ...itensValidos.map((t) =>
      prisma.turnoTaxaExtraItem.update({
        where: { id: t.itemId },
        data: {
          quantidade: t.quantidade,
          quantidadeMotoboyOriginal: turno.taxaExtraItens.find((item) => item.id === t.itemId)?.quantidade ?? 0,
        },
      })
    ),
  ]);

  revalidatePath("/dashboard");
  revalidatePath(`/turnos/${turnoId}`);
}

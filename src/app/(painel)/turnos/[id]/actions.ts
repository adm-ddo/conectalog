"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenantCompleto } from "@/lib/auth-empresa";
import { calcularValores, encontrarPerfilFixo, aplicarRemuneracaoGestor } from "@/lib/precificacao";
import { valorEfetivo, paraNumero } from "@/lib/valores";
import { diaSemanaBrasil } from "@/lib/data";

export type EncerrarManualState = { erro?: string } | undefined;

/** Encerra na mão um turno que o motoboy deixou aberto — botão que só
 * aparece na tela do turno depois de passados 15min do horário
 * configurado de fim (ver podeEncerrarManualmente, page.tsx), pra dar
 * chance dele encerrar sozinho antes. Diferente do cron
 * (fecharTurnosEsquecidos, sempre fecha com 0 ou com o número do
 * cliente): aqui é a cooperativa quem informa a quantidade de verdade
 * (perguntando pro motoboy por telefone, por exemplo), então passa pelo
 * calcularValores normal como se fosse o próprio motoboy fechando —
 * mesmo garantido de turno fixo, mesma regra de taxa extra. Fica
 * registrado quem encerrou e quando (encerradoManualmente), pra ficar
 * claro na tela que não foi o motoboy que fez isso. Sem foto/assinatura
 * (a cooperativa não tem como tirar essas do motoboy à distância). */
export async function encerrarTurnoManualmente(
  turnoId: number,
  quantidadeBandas: number,
  quantidadeRetornos: number,
  taxasExtras: { itemId: number; quantidade: number }[],
  observacao: string
): Promise<EncerrarManualState> {
  const sessao = await requireTenantCompleto();

  const turno = await prisma.turno.findFirst({
    where: { id: turnoId, status: "ABERTO", motoboy: { empresaId: sessao.empresaEfetivoId } },
    include: {
      cliente: { include: { turnosFixos: true } },
      taxaExtraItens: true,
      motoboy: { select: { ehGestor: true, modoRemuneracaoGestor: true, valorBandaGestorEspecial: true } },
    },
  });
  if (!turno) return { erro: "Turno não encontrado ou já foi encerrado." };
  if (quantidadeBandas < 0 || quantidadeRetornos < 0) return { erro: "Quantidade inválida." };

  const itensComQuantidade = turno.taxaExtraItens.map((item) => ({
    id: item.id,
    valorMotoboyAplicado: item.valorMotoboyAplicado,
    valorClienteAplicado: item.valorClienteAplicado,
    quantidade: taxasExtras.find((t) => t.itemId === item.id)?.quantidade ?? 0,
  }));
  const totalTaxasExtras = itensComQuantidade.reduce((soma, item) => soma + item.quantidade, 0);

  // Retorno conta pro preço igual a uma banda normal (ver comentário no
  // schema, Turno.quantidadeRetornos) — só entra separado no que é
  // gravado, não no que é calculado.
  const totalBandasEquivalentes = quantidadeBandas + quantidadeRetornos;
  const empresa = await prisma.empresa.findUniqueOrThrow({ where: { id: sessao.empresaEfetivoId } });
  const { valorMotoboyBandas, valorMotoboyTaxasExtras, valorCliente } = calcularValores(
    turno.cliente,
    empresa,
    turno.horaInicio,
    turno.turnoPredefinido,
    totalBandasEquivalentes,
    itensComQuantidade.map((item) => ({
      valorMotoboy: item.valorMotoboyAplicado,
      valorCliente: item.valorClienteAplicado,
      quantidade: item.quantidade,
    }))
  );
  const valorMotoboyFinal =
    aplicarRemuneracaoGestor(valorMotoboyBandas, totalBandasEquivalentes, turno.motoboy) + valorMotoboyTaxasExtras;

  const perfilFixo =
    turno.turnoPredefinido !== "LIVRE"
      ? encontrarPerfilFixo(turno.cliente.turnosFixos, turno.turnoPredefinido, diaSemanaBrasil(turno.horaInicio))
      : null;
  const valorBandaAplicado = perfilFixo
    ? paraNumero(perfilFixo.valorExcedenteMotoboy)
    : valorEfetivo(turno.cliente.valorBandaMotoboy, empresa.valorBandaMotoboyPadrao);

  await prisma.$transaction([
    prisma.turno.update({
      where: { id: turno.id },
      data: {
        horaFim: new Date(),
        quantidadeBandas,
        quantidadeRetornos,
        quantidadeTaxasExtras: totalTaxasExtras,
        valorBandaAplicado,
        valorTotal: valorMotoboyFinal,
        valorCobradoCliente: valorCliente,
        status: "CONCLUIDO",
        encerradoManualmente: true,
        encerradoManualmenteEm: new Date(),
        encerradoManualmentePorUsuarioId: sessao.usuarioId,
        observacaoEncerramentoManual: observacao.trim() || null,
      },
    }),
    ...itensComQuantidade.map((item) =>
      prisma.turnoTaxaExtraItem.update({
        where: { id: item.id },
        data: { quantidade: item.quantidade },
      })
    ),
  ]);

  revalidatePath(`/turnos/${turno.id}`);
  revalidatePath("/dashboard/ativos");
  revalidatePath("/dashboard");
}

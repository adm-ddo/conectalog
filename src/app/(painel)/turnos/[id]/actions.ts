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

/** Invalida um turno inteiro por suspeita de fraude — diferente de
 * resolverDivergenciaTurno (dashboard/actions.ts), que assume boa-fé dos
 * dois lados e só ajusta um número: aqui o gestor está dizendo que o
 * motoboy tentou aplicar um golpe (alegou ter trabalhado, o cliente nega).
 * Zera o valor (não conta em nada financeiro — status novo fica fora dos
 * filtros fechados que todo relatório/pagamento já usa) mas preserva
 * quantidadeBandas/quantidadeRetornos como prova do que foi alegado, e
 * deixa um alerta permanente e visível no perfil do motoboy (ver
 * AlertasFraudeSection, motoboys/[id]/page.tsx). Também marca
 * resolvidoDivergenciaEm pra sumir sozinho das telas de divergência
 * pendente (dashboard e /turnos/pendentes), sem precisar mexer nelas. */
export async function invalidarTurnoPorFraude(turnoId: number, motivo: string): Promise<EncerrarManualState> {
  const sessao = await requireTenantCompleto();

  if (!motivo.trim()) return { erro: "Descreva o motivo da suspeita de fraude." };

  const turno = await prisma.turno.findFirst({
    where: {
      id: turnoId,
      motoboy: { empresaId: sessao.empresaEfetivoId },
      status: { notIn: ["PAGO", "INVALIDADO_FRAUDE"] },
    },
  });
  if (!turno) return { erro: "Turno não encontrado, já pago ou já invalidado." };

  await prisma.turno.update({
    where: { id: turno.id },
    data: {
      status: "INVALIDADO_FRAUDE",
      valorTotal: 0,
      valorCobradoCliente: 0,
      invalidadoFraudeEm: new Date(),
      invalidadoFraudePorUsuarioId: sessao.usuarioId,
      motivoFraude: motivo.trim(),
      resolvidoDivergenciaEm: new Date(),
    },
  });

  revalidatePath(`/turnos/${turno.id}`);
  revalidatePath("/turnos");
  revalidatePath("/turnos/pendentes");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/ativos");
  revalidatePath(`/motoboys/${turno.motoboyId}`);
}

/** Marca que um turno que seria "diária" (ClienteTurnoFixo) teve um
 * problema técnico (pane na moto) ou pessoal/familiar que fez o motoboy
 * sair antes da hora — a cooperativa não quer pagar nem cobrar a diária
 * cheia nesse caso, só as bandas que ele de fato fez. Recalcula
 * valorTotal/valorCobradoCliente forçando o modelo "por banda" simples
 * (ver calcularValores, opcoes.ignorarPerfilFixo) — quantidadeBandas
 * continua sendo o que ele realmente fez, não muda. Diferente de
 * invalidarTurnoPorFraude (que zera tudo por suspeita de golpe): aqui o
 * motoboy trabalhou de verdade, só não completou o turno inteiro, e isso
 * é reconhecido como legítimo. */
export async function marcarProblemaTecnico(turnoId: number, observacao: string): Promise<EncerrarManualState> {
  const sessao = await requireTenantCompleto();

  if (!observacao.trim()) return { erro: "Descreva o que aconteceu (pane na moto, imprevisto pessoal etc.)." };

  const turno = await prisma.turno.findFirst({
    where: {
      id: turnoId,
      status: "CONCLUIDO",
      problemaTecnico: false,
      motoboy: { empresaId: sessao.empresaEfetivoId },
    },
    include: {
      cliente: { include: { turnosFixos: true } },
      taxaExtraItens: true,
      motoboy: { select: { ehGestor: true, modoRemuneracaoGestor: true, valorBandaGestorEspecial: true } },
    },
  });
  if (!turno) return { erro: "Turno não encontrado, ainda não concluído, ou já marcado." };

  const perfilFixo =
    turno.turnoPredefinido !== "LIVRE"
      ? encontrarPerfilFixo(turno.cliente.turnosFixos, turno.turnoPredefinido, diaSemanaBrasil(turno.horaInicio))
      : null;
  if (!perfilFixo) {
    return { erro: "Esse turno já é cobrado só por banda, não tem diária pra remover." };
  }

  const totalBandasEquivalentes = turno.quantidadeBandas + turno.quantidadeRetornos;
  const empresa = await prisma.empresa.findUniqueOrThrow({ where: { id: sessao.empresaEfetivoId } });
  const { valorMotoboyBandas, valorMotoboyTaxasExtras, valorCliente } = calcularValores(
    turno.cliente,
    empresa,
    turno.horaInicio,
    turno.turnoPredefinido,
    totalBandasEquivalentes,
    turno.taxaExtraItens.map((item) => ({
      valorMotoboy: item.valorMotoboyAplicado,
      valorCliente: item.valorClienteAplicado,
      quantidade: item.quantidade,
    })),
    { ignorarPerfilFixo: true }
  );
  const valorMotoboyFinal =
    aplicarRemuneracaoGestor(valorMotoboyBandas, totalBandasEquivalentes, turno.motoboy) + valorMotoboyTaxasExtras;
  const valorBandaAplicado = valorEfetivo(turno.cliente.valorBandaMotoboy, empresa.valorBandaMotoboyPadrao);

  await prisma.turno.update({
    where: { id: turno.id },
    data: {
      valorBandaAplicado,
      valorTotal: valorMotoboyFinal,
      valorCobradoCliente: valorCliente,
      problemaTecnico: true,
      problemaTecnicoEm: new Date(),
      problemaTecnicoPorUsuarioId: sessao.usuarioId,
      observacaoProblemaTecnico: observacao.trim(),
    },
  });

  revalidatePath(`/turnos/${turno.id}`);
  revalidatePath("/turnos");
  revalidatePath("/dashboard");
  revalidatePath(`/motoboys/${turno.motoboyId}`);
}

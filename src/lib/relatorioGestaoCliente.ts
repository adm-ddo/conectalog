import "server-only";
import { prisma } from "@/lib/prisma";
import { instanteBrasil } from "@/lib/data";
import { paraNumero } from "@/lib/valores";
import type { TurnoPredefinido, TipoEquipamento } from "@/generated/prisma/enums";

/** Meia-noite (Brasília) do dia seguinte à data ISO — mesmo helper de
 * src/lib/relatorios.ts, duplicado aqui de propósito (ver comentário no
 * topo do arquivo sobre não importar nada de lá). */
function inicioDoDiaSeguinteBrasil(dataISO: string): Date {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const proximo = new Date(ano, mes - 1, dia + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return instanteBrasil(`${proximo.getFullYear()}-${pad(proximo.getMonth() + 1)}-${pad(proximo.getDate())}`);
}

export type ItemRelatorioGestao = {
  motoboyNome: string;
  tipoEquipamento: TipoEquipamento | null;
  data: Date;
  tipo: "TURNO" | "APOIO";
  turnoPredefinido: TurnoPredefinido | null;
  horaInicio: Date | null;
  horaFim: Date | null;
  quantidadeBandas: number;
  valorCobradoCliente: number;
};

export type ChamadoIfoodGestao = {
  id: number;
  numeroPedidoSaipos: string;
  numeroPedidoIfood: string;
  valorIfood: number;
  valorDesconto: number;
  criadoEm: Date;
};

export type RelatorioGestaoCliente = {
  clienteNome: string;
  dataInicio: string;
  dataFim: string;
  totalBandas: number;
  /// Já líquido dos descontos de chamado iFood (nunca negativo).
  totalValorCobrado: number;
  totalTurnos: number;
  turnosAbertosNaoIncluidos: number;
  totalEscalas: number;
  totalConfirmados: number;
  totalDescontoIfood: number;
  chamadosIfood: ChamadoIfoodGestao[];
  itens: ItemRelatorioGestao[];
};

/** Relatório do painel de GESTÃO do cliente (/gestao/[token]) — mesma
 * janela de Turno + Apoio + EscalaTurno que src/lib/relatorios.ts usa
 * pro painel interno da cooperativa, mas projetando só o que é seguro
 * mostrar pro RESTAURANTE: quem trabalhou, quando, quantas bandas, e
 * quanto ELE (cliente) paga por isso (valorCobradoCliente). Nunca inclui
 * o que o motoboy recebe nem a margem da cooperativa — por isso é uma
 * função própria, não um wrapper de gerarRelatorioCliente (que mistura
 * os dois lados) — assim não tem risco de um campo financeiro interno
 * vazar por um import errado no dia em que alguém mexer lá. */
export async function gerarRelatorioGestaoCliente(
  clienteId: number,
  dataInicio: string,
  dataFim: string
): Promise<RelatorioGestaoCliente | null> {
  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { nome: true } });
  if (!cliente) return null;

  const inicio = instanteBrasil(dataInicio);
  const fimExclusivo = inicioDoDiaSeguinteBrasil(dataFim);

  const [turnos, apoios, turnosAbertos, escalas, chamadosIfoodBrutos] = await Promise.all([
    prisma.turno.findMany({
      where: { clienteId, horaInicio: { gte: inicio, lt: fimExclusivo }, status: { in: ["CONCLUIDO", "PAGO"] } },
      select: {
        motoboy: { select: { nomeCompleto: true, tipoEquipamento: true } },
        turnoPredefinido: true,
        horaInicio: true,
        horaFim: true,
        quantidadeBandas: true,
        valorCobradoCliente: true,
      },
      orderBy: { horaInicio: "asc" },
    }),
    prisma.apoio.findMany({
      where: { clienteId, criadoEm: { gte: inicio, lt: fimExclusivo } },
      select: {
        motoboy: { select: { nomeCompleto: true, tipoEquipamento: true } },
        criadoEm: true,
        quantidadeBandas: true,
        valorCobradoCliente: true,
      },
      orderBy: { criadoEm: "asc" },
    }),
    prisma.turno.count({
      where: { clienteId, horaInicio: { gte: inicio, lt: fimExclusivo }, status: "ABERTO" },
    }),
    prisma.escalaTurno.findMany({
      where: { clienteId, data: { gte: new Date(dataInicio), lte: new Date(dataFim) } },
      select: { statusConfirmacao: true },
    }),
    prisma.chamadoIfood.findMany({
      where: { clienteId, criadoEm: { gte: inicio, lt: fimExclusivo } },
      orderBy: { criadoEm: "asc" },
    }),
  ]);

  const chamadosIfood: ChamadoIfoodGestao[] = chamadosIfoodBrutos.map((c) => ({
    id: c.id,
    numeroPedidoSaipos: c.numeroPedidoSaipos,
    numeroPedidoIfood: c.numeroPedidoIfood,
    valorIfood: paraNumero(c.valorIfood),
    valorDesconto: paraNumero(c.valorDesconto),
    criadoEm: c.criadoEm,
  }));
  const totalDescontoIfood = chamadosIfood.reduce((soma, c) => soma + c.valorDesconto, 0);

  const itens: ItemRelatorioGestao[] = [
    ...turnos.map((t) => ({
      motoboyNome: t.motoboy.nomeCompleto,
      tipoEquipamento: t.motoboy.tipoEquipamento,
      data: t.horaInicio,
      tipo: "TURNO" as const,
      turnoPredefinido: t.turnoPredefinido,
      horaInicio: t.horaInicio,
      horaFim: t.horaFim,
      quantidadeBandas: t.quantidadeBandas,
      valorCobradoCliente: paraNumero(t.valorCobradoCliente),
    })),
    ...apoios.map((a) => ({
      motoboyNome: a.motoboy.nomeCompleto,
      tipoEquipamento: a.motoboy.tipoEquipamento,
      data: a.criadoEm,
      tipo: "APOIO" as const,
      turnoPredefinido: null,
      horaInicio: null,
      horaFim: null,
      quantidadeBandas: a.quantidadeBandas,
      valorCobradoCliente: paraNumero(a.valorCobradoCliente),
    })),
  ].sort((x, y) => x.data.getTime() - y.data.getTime());

  return {
    clienteNome: cliente.nome,
    dataInicio,
    dataFim,
    totalBandas: itens.reduce((soma, i) => soma + i.quantidadeBandas, 0),
    totalValorCobrado: Math.max(0, itens.reduce((soma, i) => soma + i.valorCobradoCliente, 0) - totalDescontoIfood),
    totalTurnos: itens.length,
    turnosAbertosNaoIncluidos: turnosAbertos,
    totalEscalas: escalas.length,
    totalConfirmados: escalas.filter((e) => e.statusConfirmacao === "CONFIRMADO").length,
    totalDescontoIfood,
    chamadosIfood,
    itens,
  };
}

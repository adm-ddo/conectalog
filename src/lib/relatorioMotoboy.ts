import "server-only";
import { prisma } from "@/lib/prisma";
import { instanteBrasil } from "@/lib/data";
import { paraNumero } from "@/lib/valores";
import type { TurnoPredefinido } from "@/generated/prisma/enums";

/** Meia-noite (Brasília) do dia seguinte à data ISO — mesmo helper de
 * src/lib/relatorios.ts, duplicado aqui de propósito (mesmo motivo do
 * relatorioGestaoCliente.ts: cada relatório fica autocontido). */
function inicioDoDiaSeguinteBrasil(dataISO: string): Date {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const proximo = new Date(ano, mes - 1, dia + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return instanteBrasil(`${proximo.getFullYear()}-${pad(proximo.getMonth() + 1)}-${pad(proximo.getDate())}`);
}

export type ItemRelatorioMotoboy = {
  tipo: "TURNO" | "APOIO";
  clienteNome: string;
  data: Date;
  turnoPredefinido: TurnoPredefinido | null;
  horaInicio: Date | null;
  horaFim: Date | null;
  quantidadeBandas: number;
  valorRecebe: number;
};

export type RelatorioMotoboy = {
  motoboyNome: string;
  dataInicio: string;
  dataFim: string;
  totalBandas: number;
  totalValor: number;
  itens: ItemRelatorioMotoboy[];
  vales: { id: number; valor: number; data: Date; descontado: boolean; observacao: string | null }[];
  ocorrencias: { id: number; descricao: string; valor: number; descontado: boolean }[];
  descontosAssiduidade: { id: number; valor: number; minutosAtraso: number; descontado: boolean }[];
};

/** Relatório de UM motoboy específico num período, pro painel interno da
 * cooperativa (/relatorios, modo "por motoboy") — turno a turno e apoio a
 * apoio (qualquer cliente, incluindo apoio avulso sem turno de base),
 * quanto ele recebeu em cada um, mais vale/ocorrência/desconto de
 * assiduidade do período. Complementa gerarRelatorioCliente (que já dá
 * pra ver o total de cada motoboy somando "todos os clientes", mas sem o
 * detalhe turno a turno) — aqui é o extrato individual completo. */
export async function gerarRelatorioMotoboy(
  empresaId: number,
  motoboyId: number,
  dataInicio: string,
  dataFim: string
): Promise<RelatorioMotoboy | null> {
  const motoboy = await prisma.motoboy.findFirst({
    where: { id: motoboyId, empresaId },
    select: { nomeCompleto: true },
  });
  if (!motoboy) return null;

  const inicio = instanteBrasil(dataInicio);
  const fimExclusivo = inicioDoDiaSeguinteBrasil(dataFim);

  const [turnos, apoios, vales, ocorrencias, descontosAssiduidade] = await Promise.all([
    prisma.turno.findMany({
      where: { motoboyId, horaInicio: { gte: inicio, lt: fimExclusivo }, status: { in: ["CONCLUIDO", "PAGO"] } },
      select: {
        cliente: { select: { nome: true } },
        turnoPredefinido: true,
        horaInicio: true,
        horaFim: true,
        quantidadeBandas: true,
        valorTotal: true,
      },
      orderBy: { horaInicio: "asc" },
    }),
    prisma.apoio.findMany({
      where: { motoboyId, criadoEm: { gte: inicio, lt: fimExclusivo } },
      select: {
        cliente: { select: { nome: true } },
        criadoEm: true,
        quantidadeBandas: true,
        valorTotal: true,
      },
      orderBy: { criadoEm: "asc" },
    }),
    prisma.vale.findMany({
      where: { motoboyId, data: { gte: inicio, lt: fimExclusivo } },
      orderBy: { data: "asc" },
    }),
    prisma.ocorrencia.findMany({
      where: { motoboyId, turno: { horaInicio: { gte: inicio, lt: fimExclusivo } } },
    }),
    prisma.descontoAssiduidade.findMany({
      where: { motoboyId, turno: { horaInicio: { gte: inicio, lt: fimExclusivo } } },
    }),
  ]);

  const itens: ItemRelatorioMotoboy[] = [
    ...turnos.map((t) => ({
      tipo: "TURNO" as const,
      clienteNome: t.cliente.nome,
      data: t.horaInicio,
      turnoPredefinido: t.turnoPredefinido,
      horaInicio: t.horaInicio,
      horaFim: t.horaFim,
      quantidadeBandas: t.quantidadeBandas,
      valorRecebe: paraNumero(t.valorTotal),
    })),
    ...apoios.map((a) => ({
      tipo: "APOIO" as const,
      clienteNome: a.cliente.nome,
      data: a.criadoEm,
      turnoPredefinido: null,
      horaInicio: null,
      horaFim: null,
      quantidadeBandas: a.quantidadeBandas,
      valorRecebe: paraNumero(a.valorTotal),
    })),
  ].sort((x, y) => x.data.getTime() - y.data.getTime());

  return {
    motoboyNome: motoboy.nomeCompleto,
    dataInicio,
    dataFim,
    totalBandas: itens.reduce((soma, i) => soma + i.quantidadeBandas, 0),
    totalValor: itens.reduce((soma, i) => soma + i.valorRecebe, 0),
    itens,
    vales: vales.map((v) => ({
      id: v.id,
      valor: paraNumero(v.valor),
      data: v.data,
      descontado: v.descontadoEm !== null,
      observacao: v.observacao,
    })),
    ocorrencias: ocorrencias.map((o) => ({
      id: o.id,
      descricao: o.descricao,
      valor: paraNumero(o.valorDesconto),
      descontado: o.pagamentoId !== null,
    })),
    descontosAssiduidade: descontosAssiduidade.map((d) => ({
      id: d.id,
      valor: paraNumero(d.valorDesconto),
      minutosAtraso: d.minutosAtraso,
      descontado: d.pagamentoId !== null,
    })),
  };
}

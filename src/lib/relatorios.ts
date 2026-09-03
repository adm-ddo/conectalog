import "server-only";
import { prisma } from "@/lib/prisma";
import { instanteBrasil } from "@/lib/data";
import { paraNumero } from "@/lib/valores";

/** Meia-noite (Brasília) do dia seguinte à data ISO — usada como limite
 * exclusivo superior, pra incluir o dia "fim" inteiro na consulta sem
 * depender de horário dentro dele. */
function inicioDoDiaSeguinteBrasil(dataISO: string): Date {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const proximo = new Date(ano, mes - 1, dia + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return instanteBrasil(`${proximo.getFullYear()}-${pad(proximo.getMonth() + 1)}-${pad(proximo.getDate())}`);
}

export type LinhaMotoboyRelatorio = {
  motoboyId: number;
  nome: string;
  bandas: number;
  valorRecebe: number;
  valorCliente: number;
  itensTotal: number;
  itensPagos: number;
  statusPagamento: "PAGO" | "PARCIAL" | "PENDENTE" | "SEM_ATENDIMENTO";
  vales: { id: number; valor: number; data: Date; descontado: boolean; observacao: string | null }[];
  ocorrencias: { id: number; descricao: string; valor: number; descontado: boolean }[];
  descontosAssiduidade: { id: number; valor: number; minutosAtraso: number; descontado: boolean }[];
};

export type RelatorioCliente = {
  clienteNome: string;
  dataInicio: string;
  dataFim: string;
  valorTotalCliente: number;
  totalBandas: number;
  turnosAbertosNaoIncluidos: number;
  motoboys: LinhaMotoboyRelatorio[];
};

/** Monta o relatório detalhado de um cliente num período: quanto ele deve
 * pagar no total, quais motoboys trabalharam (turno + apoio), quantas
 * bandas cada um fez, quanto cada um recebe, e qualquer vale/ocorrência/
 * desconto de assiduidade daquele motoboy no período — com o status de
 * pagamento já puxado do próprio Turno/Apoio (não duplica o cálculo do
 * fechamento em pagamentos/actions.ts, só lê o que já foi decidido lá). */
export async function gerarRelatorioCliente(
  empresaId: number,
  clienteId: number,
  dataInicio: string,
  dataFim: string
): Promise<RelatorioCliente | null> {
  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, empresaId },
    select: { nome: true },
  });
  if (!cliente) return null;

  const inicio = instanteBrasil(dataInicio);
  const fimExclusivo = inicioDoDiaSeguinteBrasil(dataFim);

  const [turnos, apoios, turnosAbertos] = await Promise.all([
    prisma.turno.findMany({
      where: {
        clienteId,
        horaInicio: { gte: inicio, lt: fimExclusivo },
        status: { in: ["CONCLUIDO", "PAGO"] },
      },
      select: {
        motoboyId: true,
        motoboy: { select: { nomeCompleto: true } },
        quantidadeBandas: true,
        valorTotal: true,
        valorCobradoCliente: true,
        status: true,
      },
    }),
    prisma.apoio.findMany({
      where: { clienteId, turno: { horaInicio: { gte: inicio, lt: fimExclusivo } } },
      select: {
        pagamentoId: true,
        quantidadeBandas: true,
        valorTotal: true,
        valorCobradoCliente: true,
        turno: { select: { motoboyId: true, motoboy: { select: { nomeCompleto: true } } } },
      },
    }),
    prisma.turno.count({
      where: { clienteId, horaInicio: { gte: inicio, lt: fimExclusivo }, status: "ABERTO" },
    }),
  ]);

  const motoboyIds = new Set<number>();
  for (const t of turnos) motoboyIds.add(t.motoboyId);
  for (const a of apoios) motoboyIds.add(a.turno.motoboyId);

  const [vales, ocorrencias, descontosAssiduidade] = await Promise.all([
    motoboyIds.size === 0
      ? []
      : prisma.vale.findMany({
          where: { motoboyId: { in: [...motoboyIds] }, data: { gte: inicio, lt: fimExclusivo } },
          orderBy: { data: "asc" },
        }),
    motoboyIds.size === 0
      ? []
      : prisma.ocorrencia.findMany({
          where: { clienteId, turno: { horaInicio: { gte: inicio, lt: fimExclusivo } } },
        }),
    motoboyIds.size === 0
      ? []
      : prisma.descontoAssiduidade.findMany({
          where: { turno: { clienteId, horaInicio: { gte: inicio, lt: fimExclusivo } } },
        }),
  ]);

  const porMotoboy = new Map<
    number,
    {
      nome: string;
      bandas: number;
      valorRecebe: number;
      valorCliente: number;
      itensTotal: number;
      itensPagos: number;
    }
  >();

  function linha(motoboyId: number, nome: string) {
    let atual = porMotoboy.get(motoboyId);
    if (!atual) {
      atual = { nome, bandas: 0, valorRecebe: 0, valorCliente: 0, itensTotal: 0, itensPagos: 0 };
      porMotoboy.set(motoboyId, atual);
    }
    return atual;
  }

  for (const t of turnos) {
    const l = linha(t.motoboyId, t.motoboy.nomeCompleto);
    l.bandas += t.quantidadeBandas;
    l.valorRecebe += paraNumero(t.valorTotal);
    l.valorCliente += paraNumero(t.valorCobradoCliente);
    l.itensTotal += 1;
    if (t.status === "PAGO") l.itensPagos += 1;
  }
  for (const a of apoios) {
    const l = linha(a.turno.motoboyId, a.turno.motoboy.nomeCompleto);
    l.bandas += a.quantidadeBandas;
    l.valorRecebe += paraNumero(a.valorTotal);
    l.valorCliente += paraNumero(a.valorCobradoCliente);
    l.itensTotal += 1;
    if (a.pagamentoId !== null) l.itensPagos += 1;
  }

  const motoboys: LinhaMotoboyRelatorio[] = [...porMotoboy.entries()].map(([motoboyId, dados]) => ({
    motoboyId,
    nome: dados.nome,
    bandas: dados.bandas,
    valorRecebe: dados.valorRecebe,
    valorCliente: dados.valorCliente,
    itensTotal: dados.itensTotal,
    itensPagos: dados.itensPagos,
    statusPagamento:
      dados.itensTotal === 0
        ? "SEM_ATENDIMENTO"
        : dados.itensPagos === dados.itensTotal
          ? "PAGO"
          : dados.itensPagos === 0
            ? "PENDENTE"
            : "PARCIAL",
    vales: vales
      .filter((v) => v.motoboyId === motoboyId)
      .map((v) => ({
        id: v.id,
        valor: paraNumero(v.valor),
        data: v.data,
        descontado: v.descontadoEm !== null,
        observacao: v.observacao,
      })),
    ocorrencias: ocorrencias
      .filter((o) => o.motoboyId === motoboyId)
      .map((o) => ({
        id: o.id,
        descricao: o.descricao,
        valor: paraNumero(o.valorDesconto),
        descontado: o.pagamentoId !== null,
      })),
    descontosAssiduidade: descontosAssiduidade
      .filter((d) => d.motoboyId === motoboyId)
      .map((d) => ({
        id: d.id,
        valor: paraNumero(d.valorDesconto),
        minutosAtraso: d.minutosAtraso,
        descontado: d.pagamentoId !== null,
      })),
  }));

  motoboys.sort((a, b) => b.valorCliente - a.valorCliente);

  return {
    clienteNome: cliente.nome,
    dataInicio,
    dataFim,
    valorTotalCliente: motoboys.reduce((soma, m) => soma + m.valorCliente, 0),
    totalBandas: motoboys.reduce((soma, m) => soma + m.bandas, 0),
    turnosAbertosNaoIncluidos: turnosAbertos,
    motoboys,
  };
}

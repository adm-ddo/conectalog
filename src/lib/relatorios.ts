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
  /// Soma de Turno.quantidadeRetornos no período — quantas vezes esse
  /// motoboy precisou voltar porque a expedição do cliente errou/
  /// esqueceu algo (já incluso em "bandas" pro cálculo de valor, mas
  /// contado à parte aqui como indicador de erro da expedição).
  retornos: number;
  valorRecebe: number;
  valorCliente: number;
  /// Margem que ESSE motoboy deixou pra cooperativa no período — o que o
  /// cliente pagou pelo trabalho dele menos o que ele recebeu. KPI pedido
  /// pelo Thiago pra saber quem mais dá lucro, não só quem mais entrega
  /// (bandas e lucro nem sempre andam juntos: turno fixo/garantido pode
  /// gerar bandas altas com margem baixa, e vice-versa).
  lucro: number;
  itensTotal: number;
  itensPagos: number;
  statusPagamento: "PAGO" | "PARCIAL" | "PENDENTE" | "SEM_ATENDIMENTO";
  vales: { id: number; valor: number; data: Date; descontado: boolean; observacao: string | null }[];
  ocorrencias: { id: number; descricao: string; valor: number; descontado: boolean }[];
  descontosAssiduidade: { id: number; valor: number; minutosAtraso: number; descontado: boolean }[];
};

export type ChamadoIfoodRelatorio = {
  id: number;
  numeroPedidoSaipos: string;
  numeroPedidoIfood: string;
  valorIfood: number;
  valorDesconto: number;
  criadoEm: Date;
};

export type RelatorioCliente = {
  clienteNome: string;
  dataInicio: string;
  dataFim: string;
  /// Já líquido de totalDescontoIfood (nunca negativo).
  valorTotalCliente: number;
  lucroTotal: number;
  totalBandas: number;
  /// Soma de retornos de todos os motoboys no período (ver
  /// LinhaMotoboyRelatorio.retornos).
  totalRetornos: number;
  turnosAbertosNaoIncluidos: number;
  totalEscalas: number;
  totalConfirmados: number;
  /// Soma de ChamadoIfood.valorDesconto no período — quanto foi abatido
  /// da cobrança do cliente por causa de falta de moto (ver
  /// portal/[token]/ifood/actions.ts).
  totalDescontoIfood: number;
  chamadosIfood: ChamadoIfoodRelatorio[];
  motoboys: LinhaMotoboyRelatorio[];
};

/** Monta o relatório detalhado de um cliente (ou, com clienteId null, de
 * TODOS os clientes juntos — resultado do período inteiro da
 * cooperativa) num período: quanto deve pagar no total, quais motoboys
 * trabalharam (turno + apoio), quantas bandas cada um fez, quanto cada
 * um recebe, e qualquer vale/ocorrência/desconto de assiduidade daquele
 * motoboy no período — com o status de pagamento já puxado do próprio
 * Turno/Apoio (não duplica o cálculo do fechamento em pagamentos/
 * actions.ts, só lê o que já foi decidido lá). Com clienteId null, o
 * motoboy some numa linha só somando o que ele fez em TODOS os
 * clientes, não uma linha por cliente — é isso que faz sentido pra "qual
 * o resultado total da cooperativa nesse período". */
export async function gerarRelatorioCliente(
  empresaId: number,
  clienteId: number | null,
  dataInicio: string,
  dataFim: string
): Promise<RelatorioCliente | null> {
  let clienteNome = "Todos os clientes";
  if (clienteId !== null) {
    const cliente = await prisma.cliente.findFirst({
      where: { id: clienteId, empresaId },
      select: { nome: true },
    });
    if (!cliente) return null;
    clienteNome = cliente.nome;
  }

  const inicio = instanteBrasil(dataInicio);
  const fimExclusivo = inicioDoDiaSeguinteBrasil(dataFim);
  // Mesmo filtro reaproveitado em cada query abaixo (direto ou aninhado
  // dentro de `turno: {...}`) — ou só esse cliente, ou qualquer cliente
  // dessa empresa.
  const filtroCliente = clienteId !== null ? { clienteId } : { cliente: { empresaId } };

  const [turnos, apoios, turnosAbertos, escalas, chamadosIfoodBrutos] = await Promise.all([
    prisma.turno.findMany({
      where: {
        ...filtroCliente,
        horaInicio: { gte: inicio, lt: fimExclusivo },
        status: { in: ["CONCLUIDO", "PAGO"] },
      },
      select: {
        motoboyId: true,
        motoboy: { select: { nomeCompleto: true } },
        quantidadeBandas: true,
        quantidadeRetornos: true,
        valorTotal: true,
        valorCobradoCliente: true,
        status: true,
      },
    }),
    prisma.apoio.findMany({
      where: { ...filtroCliente, criadoEm: { gte: inicio, lt: fimExclusivo } },
      select: {
        pagamentoId: true,
        quantidadeBandas: true,
        valorTotal: true,
        valorCobradoCliente: true,
        motoboyId: true,
        motoboy: { select: { nomeCompleto: true } },
      },
    }),
    prisma.turno.count({
      where: { ...filtroCliente, horaInicio: { gte: inicio, lt: fimExclusivo }, status: "ABERTO" },
    }),
    // EscalaTurno.data é @db.Date (dia puro, sem horário) — usa o mesmo
    // dataInicio/dataFim (strings YYYY-MM-DD) direto, sem instanteBrasil.
    prisma.escalaTurno.findMany({
      where: { ...filtroCliente, data: { gte: new Date(dataInicio), lte: new Date(dataFim) } },
      select: { statusConfirmacao: true },
    }),
    prisma.chamadoIfood.findMany({
      where: { ...filtroCliente, criadoEm: { gte: inicio, lt: fimExclusivo } },
      orderBy: { criadoEm: "asc" },
    }),
  ]);

  const chamadosIfood: ChamadoIfoodRelatorio[] = chamadosIfoodBrutos.map((c) => ({
    id: c.id,
    numeroPedidoSaipos: c.numeroPedidoSaipos,
    numeroPedidoIfood: c.numeroPedidoIfood,
    valorIfood: paraNumero(c.valorIfood),
    valorDesconto: paraNumero(c.valorDesconto),
    criadoEm: c.criadoEm,
  }));
  const totalDescontoIfood = chamadosIfood.reduce((soma, c) => soma + c.valorDesconto, 0);

  const motoboyIds = new Set<number>();
  for (const t of turnos) motoboyIds.add(t.motoboyId);
  for (const a of apoios) motoboyIds.add(a.motoboyId);

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
          where: { ...filtroCliente, turno: { horaInicio: { gte: inicio, lt: fimExclusivo } } },
        }),
    motoboyIds.size === 0
      ? []
      : prisma.descontoAssiduidade.findMany({
          where: { turno: { ...filtroCliente, horaInicio: { gte: inicio, lt: fimExclusivo } } },
        }),
  ]);

  const porMotoboy = new Map<
    number,
    {
      nome: string;
      bandas: number;
      retornos: number;
      valorRecebe: number;
      valorCliente: number;
      itensTotal: number;
      itensPagos: number;
    }
  >();

  function linha(motoboyId: number, nome: string) {
    let atual = porMotoboy.get(motoboyId);
    if (!atual) {
      atual = { nome, bandas: 0, retornos: 0, valorRecebe: 0, valorCliente: 0, itensTotal: 0, itensPagos: 0 };
      porMotoboy.set(motoboyId, atual);
    }
    return atual;
  }

  for (const t of turnos) {
    const l = linha(t.motoboyId, t.motoboy.nomeCompleto);
    l.bandas += t.quantidadeBandas;
    l.retornos += t.quantidadeRetornos;
    l.valorRecebe += paraNumero(t.valorTotal);
    l.valorCliente += paraNumero(t.valorCobradoCliente);
    l.itensTotal += 1;
    if (t.status === "PAGO") l.itensPagos += 1;
  }
  for (const a of apoios) {
    const l = linha(a.motoboyId, a.motoboy.nomeCompleto);
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
    retornos: dados.retornos,
    valorRecebe: dados.valorRecebe,
    valorCliente: dados.valorCliente,
    lucro: dados.valorCliente - dados.valorRecebe,
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
    clienteNome,
    dataInicio,
    dataFim,
    valorTotalCliente: Math.max(0, motoboys.reduce((soma, m) => soma + m.valorCliente, 0) - totalDescontoIfood),
    lucroTotal: motoboys.reduce((soma, m) => soma + m.lucro, 0) - totalDescontoIfood,
    totalBandas: motoboys.reduce((soma, m) => soma + m.bandas, 0),
    totalRetornos: motoboys.reduce((soma, m) => soma + m.retornos, 0),
    turnosAbertosNaoIncluidos: turnosAbertos,
    totalEscalas: escalas.length,
    totalConfirmados: escalas.filter((e) => e.statusConfirmacao === "CONFIRMADO").length,
    totalDescontoIfood,
    chamadosIfood,
    motoboys,
  };
}

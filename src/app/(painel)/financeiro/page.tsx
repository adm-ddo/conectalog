import Link from "next/link";
import { requireFinanceiro } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { dataISOBrasil } from "@/lib/data";
import { formatarMoeda } from "@/lib/valores";
import { gerarRelatorioCliente } from "@/lib/relatorios";
import { previsaoMinimaHojeCliente, confirmadoHojeCliente, semanaAnteriorCompleta } from "@/lib/financeiro";

const LABEL_STATUS_FATURA: Record<string, string> = {
  PENDENTE: "Não enviada",
  ENVIADA: "Enviada",
  PAGA: "Paga",
};
const COR_STATUS_FATURA: Record<string, string> = {
  PENDENTE: "bg-stone-100 text-stone-600",
  ENVIADA: "bg-amber-100 text-amber-800",
  PAGA: "bg-brand-100 text-brand-800",
};

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ inicio?: string; fim?: string }>;
}) {
  const sessao = await requireFinanceiro();
  const params = await searchParams;

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: sessao.empresaEfetivoId },
    select: { diaInicioSemanaFinanceira: true },
  });

  const semanaPassada = semanaAnteriorCompleta(empresa.diaInicioSemanaFinanceira);
  const hojeISO = dataISOBrasil();
  const periodoInicio = params.inicio || semanaPassada.inicio;
  const periodoFim = params.fim || semanaPassada.fim;

  const clientesAtivos = await prisma.cliente.findMany({
    where: { empresaId: sessao.empresaEfetivoId, ativo: true },
    include: { turnosFixos: true },
    orderBy: { nome: "asc" },
  });

  const [hojePorCliente, resumosPeriodo, faturasPeriodo] = await Promise.all([
    Promise.all(
      clientesAtivos.map(async (cliente) => ({
        id: cliente.id,
        nome: cliente.nome,
        previsaoMinima: previsaoMinimaHojeCliente(cliente),
        confirmado: await confirmadoHojeCliente(cliente.id),
      }))
    ),
    Promise.all(
      clientesAtivos.map((cliente) =>
        gerarRelatorioCliente(sessao.empresaEfetivoId, cliente.id, periodoInicio, periodoFim)
      )
    ),
    prisma.faturaCliente.findMany({
      where: {
        empresaId: sessao.empresaEfetivoId,
        periodoInicio: new Date(periodoInicio),
        periodoFim: new Date(periodoFim),
      },
    }),
  ]);

  const faturaPorCliente = new Map(faturasPeriodo.map((f) => [f.clienteId, f]));
  const totalPeriodo = resumosPeriodo.reduce((soma, r) => soma + (r?.valorTotalCliente ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Financeiro</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Valores a cobrar dos clientes, em tempo real e por período — acesso restrito.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-navy-900 mb-3">Hoje, por cliente</h2>
        {hojePorCliente.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhum cliente ativo.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {hojePorCliente.map((c) => (
              <div key={c.id} className="rounded-2xl border border-stone-200 bg-white p-4">
                <p className="font-semibold text-navy-900 truncate">{c.nome}</p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div>
                    <p className="text-lg font-bold text-navy-900">
                      {c.previsaoMinima > 0 ? `R$ ${formatarMoeda(c.previsaoMinima)}` : "—"}
                    </p>
                    <p className="text-[10px] text-stone-500 leading-tight">previsão mínima hoje</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-brand-700">R$ {formatarMoeda(c.confirmado)}</p>
                    <p className="text-[10px] text-stone-500 leading-tight">confirmado hoje</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-sm font-semibold text-navy-900">Notas fiscais por período</h2>
          <form method="get" className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-stone-500">De</span>
              <input
                type="date"
                name="inicio"
                defaultValue={periodoInicio}
                className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-stone-500">Até</span>
              <input
                type="date"
                name="fim"
                defaultValue={periodoFim}
                className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium px-4 py-2 transition-colors"
            >
              Ver
            </button>
            <Link
              href={`/financeiro?inicio=${semanaPassada.inicio}&fim=${semanaPassada.fim}`}
              className="text-sm text-brand-700 hover:underline px-2 py-2"
            >
              Semana passada
            </Link>
            <Link
              href={`/financeiro?inicio=${hojeISO}&fim=${hojeISO}`}
              className="text-sm text-brand-700 hover:underline px-2 py-2"
            >
              Hoje
            </Link>
          </form>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">
            Total do período (todos os clientes)
          </p>
          <p className="text-2xl font-bold text-navy-900 mt-1">R$ {formatarMoeda(totalPeriodo)}</p>
        </div>

        <ul className="flex flex-col gap-2">
          {clientesAtivos.map((cliente, i) => {
            const resumo = resumosPeriodo[i];
            const fatura = faturaPorCliente.get(cliente.id);
            return (
              <li key={cliente.id}>
                <Link
                  href={`/financeiro/${cliente.id}?inicio=${periodoInicio}&fim=${periodoFim}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 hover:border-brand-300 transition-colors"
                >
                  <div className="min-w-0 flex flex-col">
                    <span className="text-sm font-semibold text-navy-900 truncate">{cliente.nome}</span>
                    <span className="text-xs text-stone-500">
                      {resumo?.totalBandas ?? 0} bandas · {resumo?.motoboys.length ?? 0} motos ·{" "}
                      {resumo?.totalConfirmados ?? 0} de {resumo?.totalEscalas ?? 0} confirmaram
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold text-navy-900">
                      R$ {formatarMoeda(resumo?.valorTotalCliente ?? 0)}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        COR_STATUS_FATURA[fatura?.status ?? "PENDENTE"]
                      }`}
                    >
                      {fatura ? LABEL_STATUS_FATURA[fatura.status] : "Sem fatura gerada"}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

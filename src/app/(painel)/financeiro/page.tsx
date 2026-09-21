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

type ResumoModo = "hoje" | "ontem" | "semana" | "periodo";
const MODOS_RESUMO: ResumoModo[] = ["hoje", "ontem", "semana", "periodo"];
const LABEL_RESUMO: Record<ResumoModo, string> = {
  hoje: "Hoje",
  ontem: "Ontem",
  semana: "Semana passada",
  periodo: "Período",
};
const LABEL_RESUMO_POR_CLIENTE: Record<ResumoModo, string> = {
  hoje: "Hoje, por cliente",
  ontem: "Ontem, por cliente",
  semana: "Semana passada, por cliente",
  periodo: "No período, por cliente",
};

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{
    inicio?: string;
    fim?: string;
    resumo?: string;
    resumoInicio?: string;
    resumoFim?: string;
  }>;
}) {
  const sessao = await requireFinanceiro();
  const params = await searchParams;

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: sessao.empresaEfetivoId },
    select: { diaInicioSemanaFinanceira: true },
  });

  const semanaPassada = semanaAnteriorCompleta(empresa.diaInicioSemanaFinanceira);
  const agora = new Date();
  const hojeISO = dataISOBrasil(agora);
  const ontemISO = dataISOBrasil(new Date(agora.getTime() - 24 * 60 * 60 * 1000));
  const periodoInicio = params.inicio || semanaPassada.inicio;
  const periodoFim = params.fim || semanaPassada.fim;

  // Resumo financeiro (o card de lucro no topo) tem seu próprio seletor
  // de período, independente do período de "Notas fiscais" mais abaixo —
  // um é "quanto a cooperativa lucrou nesse intervalo", o outro é "quais
  // faturas preciso fechar/mandar", não fazem sentido presos ao mesmo
  // período (fatura por padrão olha pra semana passada fechada; resumo
  // por padrão olha pra hoje, que ainda nem fechou).
  const resumoModo: ResumoModo = MODOS_RESUMO.includes(params.resumo as ResumoModo)
    ? (params.resumo as ResumoModo)
    : "hoje";
  const resumoInicio =
    resumoModo === "hoje"
      ? hojeISO
      : resumoModo === "ontem"
        ? ontemISO
        : resumoModo === "semana"
          ? semanaPassada.inicio
          : params.resumoInicio || hojeISO;
  const resumoFim =
    resumoModo === "hoje"
      ? hojeISO
      : resumoModo === "ontem"
        ? ontemISO
        : resumoModo === "semana"
          ? semanaPassada.fim
          : params.resumoFim || hojeISO;

  const clientesAtivos = await prisma.cliente.findMany({
    where: { empresaId: sessao.empresaEfetivoId, ativo: true },
    include: { turnosFixos: true },
    orderBy: { nome: "asc" },
  });

  const [hojePorCliente, resumosPeriodo, faturasPeriodo, relatorioResumo, resumoPorClientePeriodo] =
    await Promise.all([
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
      // "Hoje" continua usando o par previsão-mínima/confirmado-até-agora
      // (únicos pra um dia ainda em andamento) — os outros modos usam o
      // mesmo relatório fechado (todos os clientes) que /relatorios já usa.
      resumoModo === "hoje"
        ? Promise.resolve(null)
        : gerarRelatorioCliente(sessao.empresaEfetivoId, null, resumoInicio, resumoFim),
      // Mesmo formato de "Hoje, por cliente" (um card por cliente), só que
      // pro período do resumo em vez de sempre hoje — período fechado não
      // tem a dualidade previsão/confirmado (isso é só pra um dia ainda em
      // andamento), então cada card mostra só o valor final.
      resumoModo === "hoje"
        ? Promise.resolve(null)
        : Promise.all(
            clientesAtivos.map((cliente) =>
              gerarRelatorioCliente(sessao.empresaEfetivoId, cliente.id, resumoInicio, resumoFim)
            )
          ),
    ]);

  const faturaPorCliente = new Map(faturasPeriodo.map((f) => [f.clienteId, f]));
  const totalPeriodo = resumosPeriodo.reduce((soma, r) => soma + (r?.valorTotalCliente ?? 0), 0);

  // Resumo do dia inteiro (todos os clientes somados) — o "P&L" mínimo
  // garantido de hoje e o que já é de verdade, lado a lado.
  const totalHoje = hojePorCliente.reduce(
    (soma, c) => ({
      previsaoCliente: soma.previsaoCliente + c.previsaoMinima.cliente,
      previsaoMotoboy: soma.previsaoMotoboy + c.previsaoMinima.motoboy,
      confirmadoCliente: soma.confirmadoCliente + c.confirmado.cliente,
      confirmadoMotoboy: soma.confirmadoMotoboy + c.confirmado.motoboy,
    }),
    { previsaoCliente: 0, previsaoMotoboy: 0, confirmadoCliente: 0, confirmadoMotoboy: 0 }
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Financeiro</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Valores a cobrar dos clientes, em tempo real e por período — acesso restrito.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-navy-900">Resumo financeiro</h2>
          <div className="flex flex-wrap gap-2">
            {MODOS_RESUMO.map((modo) => (
              <Link
                key={modo}
                href={
                  modo === "periodo"
                    ? `/financeiro?resumo=periodo&resumoInicio=${resumoInicio}&resumoFim=${resumoFim}`
                    : `/financeiro?resumo=${modo}`
                }
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  resumoModo === modo
                    ? "bg-navy-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {LABEL_RESUMO[modo]}
              </Link>
            ))}
          </div>
        </div>

        {resumoModo === "periodo" && (
          <form method="get" className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="resumo" value="periodo" />
            <label className="flex flex-col gap-1">
              <span className="text-xs text-stone-500">De</span>
              <input
                type="date"
                name="resumoInicio"
                defaultValue={resumoInicio}
                className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-stone-500">Até</span>
              <input
                type="date"
                name="resumoFim"
                defaultValue={resumoFim}
                className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium px-4 py-2 transition-colors"
            >
              Ver
            </button>
          </form>
        )}

        {resumoModo === "hoje" ? (
          <div className="rounded-2xl border border-navy-200 bg-navy-900 text-white p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] text-navy-200 uppercase tracking-wide font-semibold mb-2">
                  Piso garantido (mínimo do dia)
                </p>
                <LinhaResumo label="Cobrado dos clientes" valor={totalHoje.previsaoCliente} />
                <LinhaResumo label="Devido aos motoboys" valor={totalHoje.previsaoMotoboy} />
                <LinhaResumo
                  label="Lucro mínimo"
                  valor={totalHoje.previsaoCliente - totalHoje.previsaoMotoboy}
                  destaque
                />
              </div>
              <div>
                <p className="text-[11px] text-navy-200 uppercase tracking-wide font-semibold mb-2">
                  Confirmado até agora
                </p>
                <LinhaResumo label="Cobrado dos clientes" valor={totalHoje.confirmadoCliente} />
                <LinhaResumo label="Devido aos motoboys" valor={totalHoje.confirmadoMotoboy} />
                <LinhaResumo
                  label="Lucro"
                  valor={totalHoje.confirmadoCliente - totalHoje.confirmadoMotoboy}
                  destaque
                />
              </div>
            </div>
            <p className="text-[11px] text-navy-300 mt-4">
              &quot;Piso garantido&quot; é o valor mínimo travado pela configuração de cada cliente — em
              cliente sem carência, o garantido do motoboy costuma ser maior que o fixo cobrado dele,
              então o lucro mínimo nasce negativo de propósito: só fecha positivo depois que as
              entregas de verdade acontecerem.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-navy-200 bg-navy-900 text-white p-5 max-w-sm">
            <p className="text-[11px] text-navy-200 uppercase tracking-wide font-semibold mb-2">
              {resumoModo === "ontem" ? "Confirmado no dia" : "Confirmado no período"}
            </p>
            <LinhaResumo label="Cobrado dos clientes" valor={relatorioResumo?.valorTotalCliente ?? 0} />
            <LinhaResumo
              label="Devido aos motoboys"
              valor={relatorioResumo?.motoboys.reduce((soma, m) => soma + m.valorRecebe, 0) ?? 0}
            />
            <LinhaResumo label="Lucro" valor={relatorioResumo?.lucroTotal ?? 0} destaque />
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-navy-900 mb-3">{LABEL_RESUMO_POR_CLIENTE[resumoModo]}</h2>
        {resumoModo === "hoje" ? (
          hojePorCliente.length === 0 ? (
            <p className="text-sm text-stone-500">Nenhum cliente ativo.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {hojePorCliente.map((c) => (
                <div key={c.id} className="rounded-2xl border border-stone-200 bg-white p-4">
                  <p className="font-semibold text-navy-900 truncate mb-3">{c.nome}</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-stone-400">
                        <th className="text-left font-medium"></th>
                        <th className="text-right font-medium">Previsto</th>
                        <th className="text-right font-medium">Confirmado</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="text-stone-500 py-0.5">Cliente</td>
                        <td className="text-right font-semibold text-navy-900">
                          {formatarMoeda(c.previsaoMinima.cliente)}
                        </td>
                        <td className="text-right font-semibold text-navy-900">
                          {formatarMoeda(c.confirmado.cliente)}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-stone-500 py-0.5">Motoboys</td>
                        <td className="text-right font-semibold text-navy-900">
                          {formatarMoeda(c.previsaoMinima.motoboy)}
                        </td>
                        <td className="text-right font-semibold text-navy-900">
                          {formatarMoeda(c.confirmado.motoboy)}
                        </td>
                      </tr>
                      <tr className="border-t border-stone-100">
                        <td className="text-stone-500 py-0.5 pt-1.5">Lucro</td>
                        <td
                          className={`text-right font-bold pt-1.5 ${
                            c.previsaoMinima.lucro < 0 ? "text-red-600" : "text-brand-700"
                          }`}
                        >
                          {formatarMoeda(c.previsaoMinima.lucro)}
                        </td>
                        <td
                          className={`text-right font-bold pt-1.5 ${
                            c.confirmado.lucro < 0 ? "text-red-600" : "text-brand-700"
                          }`}
                        >
                          {formatarMoeda(c.confirmado.lucro)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )
        ) : !resumoPorClientePeriodo || resumoPorClientePeriodo.every((r) => r === null) ? (
          <p className="text-sm text-stone-500">Nenhum cliente ativo.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientesAtivos.map((cliente, i) => {
              const r = resumoPorClientePeriodo[i];
              return (
                <div key={cliente.id} className="rounded-2xl border border-stone-200 bg-white p-4">
                  <p className="font-semibold text-navy-900 truncate mb-3">{cliente.nome}</p>
                  <table className="w-full text-xs">
                    <tbody>
                      <tr>
                        <td className="text-stone-500 py-0.5">Cliente paga</td>
                        <td className="text-right font-semibold text-navy-900">
                          {formatarMoeda(r?.valorTotalCliente ?? 0)}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-stone-500 py-0.5">Bandas</td>
                        <td className="text-right font-semibold text-navy-900">{r?.totalBandas ?? 0}</td>
                      </tr>
                      <tr className="border-t border-stone-100">
                        <td className="text-stone-500 py-0.5 pt-1.5">Lucro</td>
                        <td
                          className={`text-right font-bold pt-1.5 ${
                            (r?.lucroTotal ?? 0) < 0 ? "text-red-600" : "text-brand-700"
                          }`}
                        >
                          {formatarMoeda(r?.lucroTotal ?? 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
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

function LinhaResumo({
  label,
  valor,
  destaque,
}: {
  label: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 ${destaque ? "mt-1 pt-1 border-t border-white/15" : ""}`}>
      <span className={`text-sm ${destaque ? "font-semibold" : "text-navy-200"}`}>{label}</span>
      <span
        className={`text-sm font-bold ${destaque ? (valor < 0 ? "text-red-300" : "text-brand-300") : ""}`}
      >
        R$ {formatarMoeda(valor)}
      </span>
    </div>
  );
}

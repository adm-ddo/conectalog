import Link from "next/link";
import { requireTenant } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { dataISOBrasil } from "@/lib/data";
import { formatarMoeda } from "@/lib/valores";
import { gerarRelatorioCliente } from "@/lib/relatorios";

const LABEL_STATUS: Record<string, string> = {
  PAGO: "Pago",
  PARCIAL: "Parcialmente pago",
  PENDENTE: "Pendente",
  SEM_ATENDIMENTO: "—",
};

const COR_STATUS: Record<string, string> = {
  PAGO: "bg-brand-100 text-brand-800",
  PARCIAL: "bg-amber-100 text-amber-800",
  PENDENTE: "bg-red-100 text-red-700",
  SEM_ATENDIMENTO: "bg-stone-100 text-stone-500",
};

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string; inicio?: string; fim?: string }>;
}) {
  const sessao = await requireTenant();
  const params = await searchParams;

  const clientes = await prisma.cliente.findMany({
    where: { empresaId: sessao.empresaEfetivoId },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  const clienteId = Number(params.clienteId) || clientes[0]?.id;
  const hoje = dataISOBrasil();
  const dataInicio = params.inicio || hoje;
  const dataFim = params.fim || hoje;

  const relatorio =
    clienteId && dataInicio && dataFim
      ? await gerarRelatorioCliente(sessao.empresaEfetivoId, clienteId, dataInicio, dataFim)
      : null;

  const queryPdf = new URLSearchParams({
    clienteId: String(clienteId ?? ""),
    inicio: dataInicio,
    fim: dataFim,
  }).toString();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Relatórios</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Valor total a cobrar do cliente num período, quais motoboys atenderam e quanto cada um
          recebe.
        </p>
      </div>

      {clientes.length === 0 ? (
        <p className="text-stone-500 text-sm">Cadastre um cliente antes de tirar relatórios.</p>
      ) : (
        <>
          <form
            method="get"
            className="rounded-2xl border border-stone-200 bg-white p-4 flex flex-wrap gap-3 items-end"
          >
            <div className="flex flex-col gap-1">
              <label className="text-xs text-stone-500">Cliente</label>
              <select
                name="clienteId"
                defaultValue={clienteId}
                className="border border-stone-300 rounded-lg px-3 py-2 text-sm min-w-[200px]"
              >
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-stone-500">De</label>
              <input
                type="date"
                name="inicio"
                defaultValue={dataInicio}
                className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-stone-500">Até</label>
              <input
                type="date"
                name="fim"
                defaultValue={dataFim}
                className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2.5 transition-colors"
            >
              Gerar relatório
            </button>
            {relatorio && (
              <Link
                href={`/relatorios/pdf?${queryPdf}`}
                target="_blank"
                className="rounded-lg border border-stone-300 hover:bg-stone-50 text-navy-900 text-sm font-medium px-5 py-2.5 transition-colors"
              >
                Baixar PDF
              </Link>
            )}
          </form>

          {relatorio && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-stone-200 bg-white p-5">
                  <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">
                    {relatorio.clienteNome} deve pagar
                  </p>
                  <p className="text-2xl font-bold text-navy-900 mt-1">
                    R$ {formatarMoeda(relatorio.valorTotalCliente)}
                  </p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white p-5">
                  <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">
                    Bandas no período
                  </p>
                  <p className="text-2xl font-bold text-navy-900 mt-1">{relatorio.totalBandas}</p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white p-5">
                  <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">
                    Motoboys que atenderam
                  </p>
                  <p className="text-2xl font-bold text-navy-900 mt-1">{relatorio.motoboys.length}</p>
                </div>
              </div>

              {relatorio.turnosAbertosNaoIncluidos > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {relatorio.turnosAbertosNaoIncluidos} turno
                  {relatorio.turnosAbertosNaoIncluidos > 1 ? "s" : ""} ainda em aberto nesse período
                  não {relatorio.turnosAbertosNaoIncluidos > 1 ? "entraram" : "entrou"} nesses
                  números.
                </p>
              )}

              {relatorio.motoboys.length === 0 ? (
                <p className="text-stone-500 text-sm">Nenhum atendimento encontrado nesse período.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {relatorio.motoboys.map((m) => (
                    <li key={m.motoboyId} className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link
                          href={`/motoboys/${m.motoboyId}`}
                          className="text-sm font-semibold text-navy-900 hover:underline"
                        >
                          {m.nome}
                        </Link>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${COR_STATUS[m.statusPagamento]}`}>
                          {LABEL_STATUS[m.statusPagamento]}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-stone-500">Bandas</p>
                          <p className="font-medium text-navy-900">{m.bandas}</p>
                        </div>
                        <div>
                          <p className="text-xs text-stone-500">Ele recebe</p>
                          <p className="font-medium text-navy-900">R$ {formatarMoeda(m.valorRecebe)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-stone-500">Cliente paga</p>
                          <p className="font-medium text-navy-900">R$ {formatarMoeda(m.valorCliente)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-stone-500">Atendimentos</p>
                          <p className="font-medium text-navy-900">
                            {m.itensPagos} de {m.itensTotal} pagos
                          </p>
                        </div>
                      </div>

                      {m.vales.length > 0 && (
                        <div className="rounded-lg bg-stone-50 border border-stone-100 p-3 flex flex-col gap-1">
                          <p className="text-xs font-semibold text-stone-600">Vales no período</p>
                          {m.vales.map((v) => (
                            <p key={v.id} className="text-xs text-stone-600">
                              {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(v.data)}
                              {" — R$ "}
                              {formatarMoeda(v.valor)}
                              {v.observacao && ` (${v.observacao})`}
                              {v.descontado ? " · já descontado" : " · ainda não descontado"}
                            </p>
                          ))}
                        </div>
                      )}

                      {m.ocorrencias.length > 0 && (
                        <div className="rounded-lg bg-red-50 border border-red-100 p-3 flex flex-col gap-1">
                          <p className="text-xs font-semibold text-red-700">Ocorrências</p>
                          {m.ocorrencias.map((o) => (
                            <p key={o.id} className="text-xs text-red-700">
                              {o.descricao} — R$ {formatarMoeda(o.valor)}
                              {o.descontado ? " · já descontado" : " · ainda não descontado"}
                            </p>
                          ))}
                        </div>
                      )}

                      {m.descontosAssiduidade.length > 0 && (
                        <div className="rounded-lg bg-red-50 border border-red-100 p-3 flex flex-col gap-1">
                          <p className="text-xs font-semibold text-red-700">Descontos por atraso</p>
                          {m.descontosAssiduidade.map((d) => (
                            <p key={d.id} className="text-xs text-red-700">
                              {d.minutosAtraso} min de atraso — R$ {formatarMoeda(d.valor)}
                              {d.descontado ? " · já descontado" : " · ainda não descontado"}
                            </p>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

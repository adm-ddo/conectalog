import Link from "next/link";
import { requireTenantCompleto } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { dataISOBrasil, formatarHora, formatarData } from "@/lib/data";
import { formatarMoeda } from "@/lib/valores";
import { gerarRelatorioCliente } from "@/lib/relatorios";
import { gerarRelatorioMotoboy } from "@/lib/relatorioMotoboy";
import { LABEL_TURNO } from "@/lib/equipe";

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
  searchParams: Promise<{ modo?: string; clienteId?: string; motoboyId?: string; inicio?: string; fim?: string }>;
}) {
  const sessao = await requireTenantCompleto();
  const params = await searchParams;

  const [clientes, motoboys] = await Promise.all([
    prisma.cliente.findMany({
      where: { empresaId: sessao.empresaEfetivoId },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.motoboy.findMany({
      where: { empresaId: sessao.empresaEfetivoId, ativo: true },
      orderBy: { nomeCompleto: "asc" },
      select: { id: true, nomeCompleto: true },
    }),
  ]);

  const modo = params.modo === "motoboy" ? "motoboy" : "cliente";
  const hoje = dataISOBrasil();
  const dataInicio = params.inicio || hoje;
  const dataFim = params.fim || hoje;

  // "Todos os clientes" soma tudo junto (resultado do período inteiro da
  // cooperativa) — Number("todos") vira NaN, então precisa checar antes
  // pra não cair sem querer no fallback do primeiro cliente.
  const modoTodos = params.clienteId === "todos";
  const clienteId = modoTodos ? null : Number(params.clienteId) || clientes[0]?.id;
  const relatorio =
    modo === "cliente" && (modoTodos || clienteId) && dataInicio && dataFim
      ? await gerarRelatorioCliente(sessao.empresaEfetivoId, clienteId, dataInicio, dataFim)
      : null;

  const motoboyId = Number(params.motoboyId) || motoboys[0]?.id;
  const relatorioMotoboy =
    modo === "motoboy" && motoboyId
      ? await gerarRelatorioMotoboy(sessao.empresaEfetivoId, motoboyId, dataInicio, dataFim)
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
          recebe — ou o extrato individual de um motoboy específico.
        </p>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/relatorios?modo=cliente&inicio=${dataInicio}&fim=${dataFim}`}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            modo === "cliente" ? "bg-navy-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          Por cliente
        </Link>
        <Link
          href={`/relatorios?modo=motoboy&inicio=${dataInicio}&fim=${dataFim}`}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            modo === "motoboy" ? "bg-navy-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          Por motoboy
        </Link>
      </div>

      {modo === "motoboy" ? (
        motoboys.length === 0 ? (
          <p className="text-stone-500 text-sm">Cadastre um motoboy antes de tirar relatórios.</p>
        ) : (
          <>
            <form
              method="get"
              className="rounded-2xl border border-stone-200 bg-white p-4 flex flex-wrap gap-3 items-end"
            >
              <input type="hidden" name="modo" value="motoboy" />
              <div className="flex flex-col gap-1">
                <label className="text-xs text-stone-500">Motoboy</label>
                <select
                  name="motoboyId"
                  defaultValue={motoboyId ?? undefined}
                  className="border border-stone-300 rounded-lg px-3 py-2 text-sm min-w-[200px]"
                >
                  {motoboys.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nomeCompleto}
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
            </form>

            {relatorioMotoboy && (
              <>
                <div className="rounded-2xl border border-navy-200 bg-navy-900 text-white p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-navy-200 uppercase tracking-wide font-semibold">
                      Total que {relatorioMotoboy.motoboyNome} recebeu no período
                    </p>
                    <p className="text-3xl font-bold mt-1">R$ {formatarMoeda(relatorioMotoboy.totalValor)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-navy-200 uppercase tracking-wide font-semibold">Bandas</p>
                    <p className="text-2xl font-bold mt-1">{relatorioMotoboy.totalBandas}</p>
                    {relatorioMotoboy.totalRetornos > 0 && (
                      <p className="text-xs text-navy-300 mt-1">{relatorioMotoboy.totalRetornos} retorno{relatorioMotoboy.totalRetornos === 1 ? "" : "s"}</p>
                    )}
                  </div>
                </div>

                {relatorioMotoboy.vales.length > 0 && (
                  <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 flex flex-col gap-1">
                    <p className="text-xs font-semibold text-stone-600">Vales no período</p>
                    {relatorioMotoboy.vales.map((v) => (
                      <p key={v.id} className="text-xs text-stone-600">
                        {formatarData(v.data)} — R$ {formatarMoeda(v.valor)}
                        {v.observacao && ` (${v.observacao})`}
                        {v.descontado ? " · já descontado" : " · ainda não descontado"}
                      </p>
                    ))}
                  </div>
                )}

                {relatorioMotoboy.ocorrencias.length > 0 && (
                  <div className="rounded-lg bg-red-50 border border-red-100 p-3 flex flex-col gap-1">
                    <p className="text-xs font-semibold text-red-700">Ocorrências</p>
                    {relatorioMotoboy.ocorrencias.map((o) => (
                      <p key={o.id} className="text-xs text-red-700">
                        {o.descricao} — R$ {formatarMoeda(o.valor)}
                        {o.descontado ? " · já descontado" : " · ainda não descontado"}
                      </p>
                    ))}
                  </div>
                )}

                {relatorioMotoboy.descontosAssiduidade.length > 0 && (
                  <div className="rounded-lg bg-red-50 border border-red-100 p-3 flex flex-col gap-1">
                    <p className="text-xs font-semibold text-red-700">Descontos por atraso</p>
                    {relatorioMotoboy.descontosAssiduidade.map((d) => (
                      <p key={d.id} className="text-xs text-red-700">
                        {d.minutosAtraso} min de atraso — R$ {formatarMoeda(d.valor)}
                        {d.descontado ? " · já descontado" : " · ainda não descontado"}
                      </p>
                    ))}
                  </div>
                )}

                {relatorioMotoboy.itens.length === 0 ? (
                  <p className="text-stone-500 text-sm">Nenhum atendimento encontrado nesse período.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {relatorioMotoboy.itens.map((item, i) => (
                      <li
                        key={i}
                        className="rounded-xl border border-stone-200 bg-white px-4 py-3 flex items-center justify-between gap-2"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-navy-900">{item.clienteNome}</span>
                          <span className="text-xs text-stone-500">
                            {formatarData(item.data)}
                            {item.tipo === "TURNO" ? (
                              <>
                                {" · "}
                                {LABEL_TURNO[item.turnoPredefinido as keyof typeof LABEL_TURNO] ?? "livre"} ·{" "}
                                {formatarHora(item.horaInicio!)}
                                {item.horaFim && `–${formatarHora(item.horaFim)}`}
                              </>
                            ) : (
                              " · Apoio"
                            )}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-navy-900">
                          {item.quantidadeBandas} bandas
                          {item.quantidadeRetornos > 0 && (
                            <span className="text-red-600"> · {item.quantidadeRetornos} retorno{item.quantidadeRetornos === 1 ? "" : "s"}</span>
                          )}{" "}
                          · R$ {formatarMoeda(item.valorRecebe)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </>
        )
      ) : clientes.length === 0 ? (
        <p className="text-stone-500 text-sm">Cadastre um cliente antes de tirar relatórios.</p>
      ) : (
        <>
          <form
            method="get"
            className="rounded-2xl border border-stone-200 bg-white p-4 flex flex-wrap gap-3 items-end"
          >
            <input type="hidden" name="modo" value="cliente" />
            <div className="flex flex-col gap-1">
              <label className="text-xs text-stone-500">Cliente</label>
              <select
                name="clienteId"
                defaultValue={modoTodos ? "todos" : (clienteId ?? undefined)}
                className="border border-stone-300 rounded-lg px-3 py-2 text-sm min-w-[200px]"
              >
                <option value="todos">Todos os clientes (cooperativa)</option>
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
            {relatorio && !modoTodos && (
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
              <div className="rounded-2xl border border-navy-200 bg-navy-900 text-white p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-navy-200 uppercase tracking-wide font-semibold">
                    {modoTodos
                      ? "Total que todos os clientes vão pagar no período"
                      : `Total que ${relatorio.clienteNome} vai pagar no período`}
                  </p>
                  <p className="text-3xl font-bold mt-1">R$ {formatarMoeda(relatorio.valorTotalCliente)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-navy-200 uppercase tracking-wide font-semibold">
                    Lucro da cooperativa
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${relatorio.lucroTotal < 0 ? "text-red-300" : "text-brand-300"}`}>
                    R$ {formatarMoeda(relatorio.lucroTotal)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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
                <div className="rounded-2xl border border-stone-200 bg-white p-5">
                  <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">
                    Escaladas
                  </p>
                  <p className="text-2xl font-bold text-navy-900 mt-1">{relatorio.totalEscalas}</p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white p-5">
                  <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">
                    Confirmaram
                  </p>
                  <p className="text-2xl font-bold text-navy-900 mt-1">{relatorio.totalConfirmados}</p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white p-5">
                  <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">
                    Retornos
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${relatorio.totalRetornos > 0 ? "text-red-600" : "text-navy-900"}`}>
                    {relatorio.totalRetornos}
                  </p>
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

              {relatorio.chamadosIfood.length > 0 && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-red-800">
                      Desconto por chamado iFood — falta de moto
                    </h2>
                    <span className="text-sm font-bold text-red-700">
                      -R$ {formatarMoeda(relatorio.totalDescontoIfood)}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-1">
                    {relatorio.chamadosIfood.map((c) => (
                      <li key={c.id} className="text-xs text-red-800 flex justify-between gap-2">
                        <span>
                          Saipos {c.numeroPedidoSaipos} · iFood {c.numeroPedidoIfood} — R${" "}
                          {formatarMoeda(c.valorIfood)}
                        </span>
                        <span className="font-medium">-R$ {formatarMoeda(c.valorDesconto)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
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
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-stone-500">Bandas</p>
                          <p className="font-medium text-navy-900">{m.bandas}</p>
                        </div>
                        <div>
                          <p className="text-xs text-stone-500">Retornos</p>
                          <p className={`font-medium ${m.retornos > 0 ? "text-red-600" : "text-navy-900"}`}>
                            {m.retornos}
                          </p>
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
                          <p className="text-xs text-stone-500">Lucro que ele deixa</p>
                          <p className={`font-semibold ${m.lucro < 0 ? "text-red-600" : "text-brand-700"}`}>
                            R$ {formatarMoeda(m.lucro)}
                          </p>
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

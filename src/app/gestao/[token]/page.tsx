import Link from "next/link";
import { notFound } from "next/navigation";
import { resolverClienteGestao } from "@/lib/portalGestao";
import { gerarRelatorioGestaoCliente } from "@/lib/relatorioGestaoCliente";
import { dataISOBrasil, formatarHora, formatarData } from "@/lib/data";
import { formatarMoeda } from "@/lib/valores";
import { LABEL_TURNO } from "@/lib/equipe";
import { chegouAtrasado } from "@/lib/atrasoChegada";
import EquipamentoBadge from "@/components/EquipamentoBadge";

/** Relatório do painel de gestão: transparência máxima pra quem cuida do
 * financeiro/administrativo do restaurante conferir, por qualquer
 * período, quem trabalhou, quando, quantas bandas fez e quanto o
 * restaurante paga por isso — pra bater com a fatura que recebe da
 * cooperativa. Nunca mostra o que o motoboy recebe nem a margem da
 * cooperativa (ver gerarRelatorioGestaoCliente, que já nasce sem esses
 * campos). */
export default async function GestaoRelatorioPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ inicio?: string; fim?: string }>;
}) {
  const { token } = await params;
  const cliente = await resolverClienteGestao(token);
  if (!cliente) notFound();

  const agora = new Date();
  const hoje = dataISOBrasil(agora);
  const seteDiasAtras = dataISOBrasil(new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000));
  const query = await searchParams;
  const dataInicio = query.inicio || seteDiasAtras;
  const dataFim = query.fim || hoje;

  const relatorio = await gerarRelatorioGestaoCliente(cliente.id, dataInicio, dataFim);
  if (!relatorio) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold text-navy-900">Relatório</h1>
        <p className="text-sm text-stone-500 mt-1">
          Quem trabalhou, quando e quantas bandas fez — com o valor que você paga por cada uma.
        </p>
        <Link href={`/gestao/${token}/escala`} className="text-xs text-brand-700 hover:underline mt-1 inline-block">
          Ver escala →
        </Link>
      </div>

      <form method="get" className="rounded-2xl border border-stone-200 bg-white p-4 flex flex-wrap gap-3 items-end">
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
          Ver período
        </button>
      </form>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">Bandas</p>
          <p className="text-xl font-bold text-navy-900 mt-1">{relatorio.totalBandas}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">Valor no período</p>
          <p className="text-xl font-bold text-navy-900 mt-1">R$ {formatarMoeda(relatorio.totalValorCobrado)}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">Escaladas</p>
          <p className="text-xl font-bold text-navy-900 mt-1">{relatorio.totalEscalas}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">Confirmaram</p>
          <p className="text-xl font-bold text-navy-900 mt-1">{relatorio.totalConfirmados}</p>
        </div>
      </div>

      {relatorio.turnosAbertosNaoIncluidos > 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {relatorio.turnosAbertosNaoIncluidos} turno{relatorio.turnosAbertosNaoIncluidos > 1 ? "s" : ""} ainda em
          aberto nesse período não {relatorio.turnosAbertosNaoIncluidos > 1 ? "entraram" : "entrou"} nesses números.
        </p>
      )}

      {relatorio.itens.length === 0 ? (
        <p className="text-sm text-stone-500">Nenhum atendimento nesse período.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {relatorio.itens.map((item, i) => {
            const atrasado =
              item.tipo === "TURNO" &&
              chegouAtrasado(
                cliente,
                item.turnoPredefinido !== "LIVRE" ? item.turnoPredefinido : null,
                item.horaInicio!
              );
            return (
              <li key={i} className="rounded-xl border border-stone-200 bg-white px-4 py-3 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-navy-900 flex items-center gap-1.5 min-w-0 truncate">
                    {item.motoboyNome}
                    <EquipamentoBadge tipo={item.tipoEquipamento} />
                  </span>
                  <span className="text-xs text-stone-500 shrink-0">{formatarData(item.data)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-sm text-stone-600">
                  <span className={atrasado ? "text-red-600 font-semibold" : undefined}>
                    {item.tipo === "TURNO" ? (
                      <>
                        {LABEL_TURNO[item.turnoPredefinido as keyof typeof LABEL_TURNO] ?? "livre"} ·{" "}
                        {formatarHora(item.horaInicio!)}
                        {item.horaFim && `–${formatarHora(item.horaFim)}`}
                        {atrasado && " · atrasado"}
                      </>
                    ) : (
                      "Apoio"
                    )}
                  </span>
                  <span className="font-medium text-navy-900">
                    {item.quantidadeBandas} bandas · R$ {formatarMoeda(item.valorCobradoCliente)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

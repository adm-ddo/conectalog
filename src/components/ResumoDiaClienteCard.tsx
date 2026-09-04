import { formatarHora } from "@/lib/data";
import type { ResumoDiaCliente } from "@/lib/resumoDia";

/** Card de "bandas de hoje" pra um Cliente — mesmo componente no portal
 * dele e na tela dele no painel da cooperativa, pra mostrar sempre o
 * mesmo número dos dois lados. */
export default function ResumoDiaClienteCard({
  totalBandasNormais,
  totalBandasApoio,
  totalBandas,
  apoios,
}: ResumoDiaCliente) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-navy-900">Bandas de hoje</h2>
      <p className="text-2xl font-bold text-navy-900">
        {totalBandas}
        {totalBandasApoio > 0 && (
          <span className="text-sm font-normal text-stone-500">
            {" "}
            ({totalBandasNormais} normais + {totalBandasApoio} de apoio)
          </span>
        )}
      </p>

      {apoios.length > 0 && (
        <div className="flex flex-col gap-2 pt-2 border-t border-stone-100">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
            {apoios.length} {apoios.length === 1 ? "chamado de apoio" : "chamados de apoio"}
          </span>
          <ul className="flex flex-col gap-1">
            {apoios.map((a, indice) => (
              <li key={a.id} className="text-sm text-stone-700 flex items-center justify-between gap-3">
                <span>
                  Apoio {indice + 1} — {a.motoboyNome}
                </span>
                <span className="text-stone-500 shrink-0">
                  {a.quantidadeBandas} banda{a.quantidadeBandas === 1 ? "" : "s"} ·{" "}
                  {formatarHora(a.criadoEm)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

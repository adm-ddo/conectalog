"use client";

import { useState, useTransition } from "react";
import { resolverDivergenciaTurno } from "./actions";

export default function DivergenciaRow({
  turnoId,
  nomeMotoboy,
  nomeCliente,
  bandasMotoboy,
  taxasMotoboy,
  bandasCliente,
  taxasCliente,
}: {
  turnoId: number;
  nomeMotoboy: string;
  nomeCliente: string;
  bandasMotoboy: number;
  taxasMotoboy: number;
  bandasCliente: number;
  taxasCliente: number;
}) {
  const [bandasFinal, setBandasFinal] = useState(bandasMotoboy);
  const [taxasFinal, setTaxasFinal] = useState(taxasMotoboy);
  const [pending, startTransition] = useTransition();

  return (
    <li className="rounded-xl border border-red-200 bg-white px-4 py-3 flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold text-navy-900">
          {nomeMotoboy} em {nomeCliente}
        </p>
        <p className="text-xs text-stone-500">
          Motoboy disse {bandasMotoboy} bandas / {taxasMotoboy} taxas extras — cliente disse{" "}
          {bandasCliente} bandas / {taxasCliente} taxas extras
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Bandas (combinado)</span>
          <input
            type="number"
            min="0"
            value={bandasFinal}
            onChange={(e) => setBandasFinal(Number(e.target.value))}
            className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm w-24"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Taxas extras (combinado)</span>
          <input
            type="number"
            min="0"
            value={taxasFinal}
            onChange={(e) => setTaxasFinal(Number(e.target.value))}
            className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm w-24"
          />
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() => resolverDivergenciaTurno(turnoId, bandasFinal, taxasFinal))
          }
          className="rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold px-4 py-2 disabled:opacity-50 transition-colors"
        >
          {pending ? "Salvando..." : "Confirmar acordo"}
        </button>
      </div>
    </li>
  );
}

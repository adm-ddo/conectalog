"use client";

import { useState, useTransition } from "react";
import { resolverDivergenciaTurno } from "./actions";

type TaxaDivergente = {
  itemId: number;
  descricao: string;
  motoboy: number;
  cliente: number;
};

export default function DivergenciaRow({
  turnoId,
  nomeMotoboy,
  nomeCliente,
  bandasMotoboy,
  bandasCliente,
  taxas,
}: {
  turnoId: number;
  nomeMotoboy: string;
  nomeCliente: string;
  bandasMotoboy: number;
  bandasCliente: number;
  taxas: TaxaDivergente[];
}) {
  const [bandasFinal, setBandasFinal] = useState(bandasMotoboy);
  const [taxasFinais, setTaxasFinais] = useState<Record<number, number>>(
    Object.fromEntries(taxas.map((t) => [t.itemId, t.motoboy]))
  );
  const [pending, startTransition] = useTransition();

  const taxasDivergentes = taxas.filter((t) => t.motoboy !== t.cliente);

  return (
    <li className="rounded-xl border border-red-200 bg-white px-4 py-3 flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold text-navy-900">
          {nomeMotoboy} em {nomeCliente}
        </p>
        <p className="text-xs text-stone-500">
          Bandas: motoboy disse {bandasMotoboy}, cliente disse {bandasCliente}
        </p>
        {taxasDivergentes.map((t) => (
          <p key={t.itemId} className="text-xs text-stone-500">
            {t.descricao}: motoboy disse {t.motoboy}, cliente disse {t.cliente}
          </p>
        ))}
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
        {taxas.map((t) => (
          <label key={t.itemId} className="flex flex-col gap-1">
            <span className="text-xs text-stone-500">{t.descricao} (combinado)</span>
            <input
              type="number"
              min="0"
              value={taxasFinais[t.itemId] ?? 0}
              onChange={(e) =>
                setTaxasFinais((prev) => ({ ...prev, [t.itemId]: Number(e.target.value) }))
              }
              className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm w-24"
            />
          </label>
        ))}
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() =>
              resolverDivergenciaTurno(
                turnoId,
                bandasFinal,
                taxas.map((t) => ({ itemId: t.itemId, quantidade: taxasFinais[t.itemId] ?? 0 }))
              )
            )
          }
          className="rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold px-4 py-2 disabled:opacity-50 transition-colors"
        >
          {pending ? "Salvando..." : "Confirmar acordo"}
        </button>
      </div>
    </li>
  );
}

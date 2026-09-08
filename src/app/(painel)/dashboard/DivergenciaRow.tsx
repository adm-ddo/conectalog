"use client";

import { useState, useTransition } from "react";
import { resolverDivergenciaTurno } from "./actions";
import { calcularDeficitBandas } from "@/lib/taxaExtraDeficit";
import { formatarMoeda } from "@/lib/valores";

type TaxaDivergente = {
  itemId: number;
  descricao: string;
  motoboy: number;
  cliente: number;
  valorMotoboyUnidade: number;
};

export default function DivergenciaRow({
  turnoId,
  nomeMotoboy,
  nomeCliente,
  turnoLabel,
  bandasIncluidas,
  valorGarantidoMotoboy,
  valorExcedenteMotoboy,
  bandasMotoboy,
  bandasCliente,
  taxas,
}: {
  turnoId: number;
  nomeMotoboy: string;
  nomeCliente: string;
  turnoLabel: string;
  bandasIncluidas: number | null;
  valorGarantidoMotoboy: number | null;
  valorExcedenteMotoboy: number | null;
  bandasMotoboy: number;
  bandasCliente: number;
  taxas: TaxaDivergente[];
}) {
  const [bandasFinal, setBandasFinal] = useState(bandasMotoboy);
  const [taxasFinais, setTaxasFinais] = useState<Record<number, number>>(
    Object.fromEntries(taxas.map((t) => [t.itemId, t.motoboy]))
  );
  const [observacao, setObservacao] = useState("");
  const [pending, startTransition] = useTransition();

  const taxasDivergentes = taxas.filter((t) => t.motoboy !== t.cliente);

  const temGarantido =
    bandasIncluidas !== null && valorGarantidoMotoboy !== null && valorExcedenteMotoboy !== null;
  const { deficitBandas, deficitValor } = calcularDeficitBandas(
    temGarantido ? { bandasIncluidas, valorGarantidoMotoboy, valorExcedenteMotoboy } : null,
    bandasFinal
  );
  const taxaExtraBruta = taxas.reduce(
    (soma, t) => soma + (taxasFinais[t.itemId] ?? 0) * t.valorMotoboyUnidade,
    0
  );
  const taxaExtraLiquida = Math.max(0, taxaExtraBruta - deficitValor);

  return (
    <li className="rounded-xl border border-red-200 bg-white px-4 py-3 flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold text-navy-900">
          {nomeMotoboy} em {nomeCliente}
          <span className="ml-2 text-xs font-normal text-stone-500 capitalize">turno da {turnoLabel}</span>
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

      {temGarantido && (
        <div className="rounded-lg bg-stone-50 border border-stone-200 px-3 py-2 text-xs text-stone-600 flex flex-col gap-1">
          <p>
            Garantido do turno da {turnoLabel}: cobre até <strong>{bandasIncluidas}</strong> entregas
            (R$ {formatarMoeda(valorGarantidoMotoboy)}) — cada entrega excedente ou faltante vale R${" "}
            {formatarMoeda(valorExcedenteMotoboy)}.
          </p>
          {taxas.length > 0 &&
            (deficitBandas > 0 ? (
              <p>
                Com {bandasFinal} banda{bandasFinal === 1 ? "" : "s"} combinada
                {bandasFinal === 1 ? "" : "s"}, faltam <strong>{deficitBandas}</strong> pro garantido
                (R$ {formatarMoeda(deficitValor)}) — desconta primeiro da taxa extra: R${" "}
                {formatarMoeda(taxaExtraBruta)} bruta → R$ {formatarMoeda(taxaExtraLiquida)} líquida.
              </p>
            ) : (
              <p>
                Bateu ou passou do garantido — taxa extra soma inteira: R$ {formatarMoeda(taxaExtraBruta)}
                , sem desconto.
              </p>
            ))}
        </div>
      )}

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
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-stone-500">Observação do acordo (opcional)</span>
        <input
          type="text"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Ex.: cliente contou errado, motoboy tinha razão"
          className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm"
        />
      </label>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(() =>
            resolverDivergenciaTurno(
              turnoId,
              bandasFinal,
              taxas.map((t) => ({ itemId: t.itemId, quantidade: taxasFinais[t.itemId] ?? 0 })),
              observacao
            )
          )
        }
        className="self-start rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold px-4 py-2 disabled:opacity-50 transition-colors"
      >
        {pending ? "Salvando..." : "Confirmar acordo"}
      </button>
    </li>
  );
}

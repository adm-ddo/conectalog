"use client";

import { useState, useTransition } from "react";
import { resolverDivergenciaTurno } from "../../dashboard/actions";

type Taxa = { itemId: number; descricao: string; motoboy: number; cliente: number | null };

/** Corrige manualmente a contagem de bandas (e taxas extras) de um turno
 * onde motoboy e cliente não bateram, ou onde um dos dois nunca
 * confirmou — sempre disponível enquanto os números não baterem (o
 * chamador nem renderiza isso quando já batem, não tem o que corrigir).
 * Reaproveita resolverDivergenciaTurno, a mesma action usada no alerta
 * de divergência do dashboard. */
export default function CorrigirContagemForm({
  turnoId,
  bandasMotoboy,
  bandasCliente,
  prazoClienteEncerrado,
  taxas,
}: {
  turnoId: number;
  bandasMotoboy: number;
  bandasCliente: number | null;
  prazoClienteEncerrado: boolean;
  taxas: Taxa[];
}) {
  const [bandasFinal, setBandasFinal] = useState(bandasMotoboy);
  const [taxasFinais, setTaxasFinais] = useState<Record<number, number>>(
    Object.fromEntries(taxas.map((t) => [t.itemId, t.motoboy]))
  );
  const [observacao, setObservacao] = useState("");
  const [pending, startTransition] = useTransition();

  const taxasDivergentes = taxas.filter((t) => t.cliente !== null && t.motoboy !== t.cliente);

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-amber-800">Contagem de bandas não bate</h2>
        <p className="text-xs text-amber-800 mt-1">
          {bandasCliente === null ? (
            prazoClienteEncerrado ? (
              <>
                Cliente não confirmou dentro das 2h após o fim do turno — vale a contagem do
                motoboy ({bandasMotoboy}) até você corrigir aqui se souber que é outro número.
              </>
            ) : (
              <>Cliente ainda pode confirmar pelo portal — motoboy informou {bandasMotoboy} bandas.</>
            )
          ) : (
            <>
              Motoboy disse {bandasMotoboy}, cliente disse {bandasCliente} — escolha o valor certo.
            </>
          )}
        </p>
        {taxasDivergentes.map((t) => (
          <p key={t.itemId} className="text-xs text-amber-800">
            {t.descricao}: motoboy disse {t.motoboy}, cliente disse {t.cliente}
          </p>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-600">Bandas (combinado)</span>
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
            <span className="text-xs text-stone-600">{t.descricao} (combinado)</span>
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
        <span className="text-xs text-stone-600">Observação do acordo (opcional)</span>
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
        {pending ? "Salvando..." : "Corrigir"}
      </button>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { resolverDivergenciaTurno } from "../../dashboard/actions";

type Taxa = { itemId: number; descricao: string };

export default function CorrigirFechamentoAutomaticoForm({
  turnoId,
  taxas,
}: {
  turnoId: number;
  taxas: Taxa[];
}) {
  const [bandas, setBandas] = useState(0);
  const [taxasQuantidade, setTaxasQuantidade] = useState<Record<number, number>>(
    Object.fromEntries(taxas.map((t) => [t.itemId, 0]))
  );
  const [pending, startTransition] = useTransition();
  const [salvo, setSalvo] = useState(false);

  if (salvo) {
    return (
      <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 text-sm text-brand-800">
        Corrigido — o motoboy já vê o valor certo no relatório dele.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-amber-800">Turno fechado automaticamente</h2>
        <p className="text-xs text-amber-800 mt-1">
          O motoboy esqueceu de encerrar — o sistema fechou sozinho no horário em que o turno
          configurado deveria acabar, com 0 entregas. Pergunte pra ele quantas entregas fez de
          verdade e corrija aqui; o valor que ele vai receber só passa a valer depois disso.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-600">Entregas de verdade</span>
          <input
            type="number"
            min="0"
            value={bandas}
            onChange={(e) => setBandas(Number(e.target.value))}
            className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm w-28"
          />
        </label>
        {taxas.map((t) => (
          <label key={t.itemId} className="flex flex-col gap-1">
            <span className="text-xs text-stone-600">{t.descricao}</span>
            <input
              type="number"
              min="0"
              value={taxasQuantidade[t.itemId] ?? 0}
              onChange={(e) =>
                setTaxasQuantidade((prev) => ({ ...prev, [t.itemId]: Number(e.target.value) }))
              }
              className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm w-24"
            />
          </label>
        ))}
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await resolverDivergenciaTurno(
              turnoId,
              bandas,
              taxas.map((t) => ({ itemId: t.itemId, quantidade: taxasQuantidade[t.itemId] ?? 0 })),
              "Turno fechado automaticamente (motoboy não encerrou) — quantidade confirmada pela cooperativa."
            );
            setSalvo(true);
          })
        }
        className="self-start rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold px-4 py-2 disabled:opacity-50 transition-colors"
      >
        {pending ? "Salvando..." : "Corrigir"}
      </button>
    </div>
  );
}

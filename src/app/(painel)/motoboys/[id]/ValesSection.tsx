"use client";

import { useActionState, useTransition } from "react";
import { criarVale, marcarValeDescontado } from "../actions";
import { dataISOBrasil } from "@/lib/data";

export default function ValesSection({
  motoboyId,
  vales,
}: {
  motoboyId: number;
  vales: {
    id: number;
    valor: string;
    observacao: string | null;
    data: string;
    descontado: boolean;
  }[];
}) {
  const acaoComId = criarVale.bind(null, motoboyId);
  const [state, formAction, pending] = useActionState(acaoComId, undefined);
  const [pendingDesconto, startTransition] = useTransition();

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-navy-900">Vales</h2>

      {vales.length === 0 ? (
        <p className="text-sm text-stone-500">Nenhum vale registrado.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {vales.map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-stone-100 px-3 py-2"
            >
              <div className="min-w-0 flex flex-col">
                <span className="text-sm font-medium text-navy-900">
                  R$ {v.valor} — {v.data}
                </span>
                {v.observacao && (
                  <span className="text-xs text-stone-500 truncate">{v.observacao}</span>
                )}
              </div>
              {v.descontado ? (
                <span className="shrink-0 rounded-full bg-stone-100 text-stone-600 px-3 py-1 text-xs font-semibold">
                  Descontado
                </span>
              ) : (
                <button
                  type="button"
                  disabled={pendingDesconto}
                  onClick={() =>
                    startTransition(() => marcarValeDescontado(v.id, motoboyId))
                  }
                  className="shrink-0 rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200 px-3 py-1 text-xs font-semibold disabled:opacity-50"
                >
                  Marcar descontado
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="flex flex-col gap-3 pt-2 border-t border-stone-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-500">Valor do vale (R$)</label>
            <input
              name="valor"
              type="number"
              step="0.01"
              min="0"
              required
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-500">Data do vale</label>
            <input
              name="data"
              type="date"
              defaultValue={dataISOBrasil()}
              required
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs text-stone-500">Observação (opcional)</label>
            <input
              name="observacao"
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        {state?.erro && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {state.erro}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2 disabled:opacity-50 transition-colors"
        >
          {pending ? "Salvando..." : "Registrar vale"}
        </button>
      </form>
    </div>
  );
}

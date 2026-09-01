"use client";

import { useTransition } from "react";
import { alternarLiberacaoMotoboyCliente, alternarLivreMotoboy } from "../actions";

export default function LiberacaoClientes({
  motoboyId,
  livre,
  clientes,
}: {
  motoboyId: number;
  livre: boolean;
  clientes: { id: number; nome: string; liberado: boolean }[];
}) {
  const [pendingLivre, startLivre] = useTransition();
  const [pendingId, startCliente] = useTransition();

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-navy-900">Onde ele pode trabalhar</h2>
        <p className="text-xs text-stone-500 mt-1">
          Marque &quot;livre&quot; pra liberar em todos os clientes ativos de uma vez, ou libere
          cliente por cliente abaixo.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-navy-900">
        <input
          type="checkbox"
          defaultChecked={livre}
          disabled={pendingLivre}
          onChange={(e) =>
            startLivre(() => alternarLivreMotoboy(motoboyId, e.target.checked))
          }
          className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
        />
        Livre em qualquer cliente
      </label>

      {!livre && (
        <ul className="flex flex-col gap-2">
          {clientes.length === 0 && (
            <p className="text-sm text-stone-500">Nenhum cliente cadastrado ainda.</p>
          )}
          {clientes.map((cliente) => (
            <li key={cliente.id} className="flex items-center justify-between gap-3">
              <span className="text-sm text-stone-700">{cliente.nome}</span>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  defaultChecked={cliente.liberado}
                  disabled={pendingId}
                  onChange={(e) =>
                    startCliente(() =>
                      alternarLiberacaoMotoboyCliente(motoboyId, cliente.id, e.target.checked)
                    )
                  }
                  className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-xs text-stone-500">Liberado</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { atualizarCliente } from "../actions";

export default function EditarClienteForm({
  cliente,
}: {
  cliente: {
    id: number;
    nome: string;
    endereco: string | null;
    valorBanda: string;
    valorTaxaExtra: string;
  };
}) {
  const acaoComId = atualizarCliente.bind(null, cliente.id);
  const [state, formAction, pending] = useActionState(acaoComId, undefined);

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-3"
    >
      <h2 className="text-sm font-semibold text-navy-900">Dados do cliente</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">Nome</label>
          <input
            name="nome"
            required
            defaultValue={cliente.nome}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">Endereço</label>
          <input
            name="endereco"
            defaultValue={cliente.endereco ?? ""}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">Valor da banda (R$)</label>
          <input
            name="valorBanda"
            type="number"
            step="0.01"
            min="0"
            defaultValue={cliente.valorBanda}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">Valor da taxa extra (R$)</label>
          <input
            name="valorTaxaExtra"
            type="number"
            step="0.01"
            min="0"
            defaultValue={cliente.valorTaxaExtra}
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
        className="self-start rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2.5 disabled:opacity-50 transition-colors"
      >
        {pending ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}

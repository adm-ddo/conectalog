"use client";

import { useActionState } from "react";
import { atualizarCliente } from "../actions";
import CamposCliente, { type ValoresCliente } from "../CamposCliente";

export default function EditarClienteForm({
  clienteId,
  valores,
}: {
  clienteId: number;
  valores: ValoresCliente;
}) {
  const acaoComId = atualizarCliente.bind(null, clienteId);
  const [state, formAction, pending] = useActionState(acaoComId, undefined);

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-4"
    >
      <h2 className="text-sm font-semibold text-navy-900">Dados do cliente</h2>

      <CamposCliente valores={valores} />

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

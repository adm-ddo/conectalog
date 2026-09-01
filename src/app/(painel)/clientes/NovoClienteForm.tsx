"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { criarCliente } from "./actions";
import CamposCliente from "./CamposCliente";

export default function NovoClienteForm() {
  const [state, formAction, pending] = useActionState(criarCliente, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const enviandoRef = useRef(false);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (enviandoRef.current && !pending && !state?.erro) {
      formRef.current?.reset();
      setAberto(false);
    }
    enviandoRef.current = pending;
  }, [pending, state]);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="self-start rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2.5 transition-colors"
      >
        + Novo cliente
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-navy-900">Novo cliente</h2>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="text-xs text-stone-500 hover:underline"
        >
          Cancelar
        </button>
      </div>

      <CamposCliente />

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
        {pending ? "Salvando..." : "Adicionar cliente"}
      </button>
    </form>
  );
}

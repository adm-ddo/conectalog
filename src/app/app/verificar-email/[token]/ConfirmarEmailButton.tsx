"use client";

import { useActionState } from "react";
import { confirmarVerificacaoEmailMotoboy } from "./actions";

export default function ConfirmarEmailButton({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(confirmarVerificacaoEmailMotoboy, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="token" value={token} />
      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors"
      >
        {pending ? "Confirmando..." : "Confirmar meu e-mail"}
      </button>
    </form>
  );
}

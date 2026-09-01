"use client";

import { useActionState, useRef, useEffect } from "react";
import { convidarMembro } from "./actions";

export default function ConvidarForm() {
  const [state, formAction, pending] = useActionState(convidarMembro, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const enviandoRef = useRef(false);

  useEffect(() => {
    if (enviandoRef.current && !pending && !state?.erro) {
      formRef.current?.reset();
    }
    enviandoRef.current = pending;
  }, [pending, state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-3"
    >
      <h2 className="text-sm font-semibold text-navy-900">Convidar pra equipe</h2>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="email@exemplo.com"
          className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2 disabled:opacity-50 transition-colors"
        >
          {pending ? "Enviando..." : "Enviar convite"}
        </button>
      </div>
      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}
    </form>
  );
}

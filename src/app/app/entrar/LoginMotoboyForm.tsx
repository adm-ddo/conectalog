"use client";

import { useActionState } from "react";
import { entrarMotoboy } from "./actions";

export default function LoginMotoboyForm() {
  const [state, formAction, pending] = useActionState(entrarMotoboy, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm w-full max-w-sm"
    >
      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">E-mail</label>
        <input
          name="email"
          type="email"
          required
          autoFocus
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">Senha</label>
        <input
          name="senha"
          type="password"
          required
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 mt-1 disabled:opacity-50 transition-colors"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}

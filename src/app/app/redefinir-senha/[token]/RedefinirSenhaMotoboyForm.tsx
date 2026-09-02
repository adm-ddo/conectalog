"use client";

import { useActionState } from "react";
import { redefinirSenhaMotoboy } from "./actions";

export default function RedefinirSenhaMotoboyForm({ token }: { token: string }) {
  const acaoComToken = redefinirSenhaMotoboy.bind(null, token);
  const [state, formAction, pending] = useActionState(acaoComToken, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm w-full max-w-sm"
    >
      <div>
        <h1 className="text-xl font-semibold text-navy-900">Criar nova senha</h1>
        <p className="text-sm text-stone-500 mt-1">Escolha uma senha nova pra sua conta.</p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">Nova senha (mín. 6 caracteres)</label>
        <input
          name="novaSenha"
          type="password"
          required
          minLength={6}
          autoFocus
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">Confirmar nova senha</label>
        <input
          name="confirmarSenha"
          type="password"
          required
          minLength={6}
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
        {pending ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}

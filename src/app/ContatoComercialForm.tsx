"use client";

import { useActionState } from "react";
import { enviarContatoComercial } from "./actions";

export default function ContatoComercialForm() {
  const [state, formAction, pending] = useActionState(enviarContatoComercial, undefined);

  if (state?.sucesso) {
    return (
      <div className="rounded-2xl bg-brand-50 border border-brand-200 p-6 text-center">
        <p className="text-brand-800 font-semibold">Recebemos seu contato! 🎉</p>
        <p className="text-sm text-brand-700 mt-1">
          Vamos entrar em contato em breve pelo dado que você deixou.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 w-full max-w-md">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-navy-200">Seu nome</span>
        <input
          name="nome"
          required
          className="rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="Como podemos te chamar"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-navy-200">Telefone ou e-mail</span>
        <input
          name="contato"
          required
          className="rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="(11) 99999-9999 ou seu@email.com"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-navy-200">Conte um pouco da sua cooperativa (opcional)</span>
        <textarea
          name="mensagem"
          rows={3}
          className="rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="Quantos motoboys, quantas empresas atende, etc."
        />
      </label>
      {state?.erro && (
        <p className="text-sm text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-500 hover:bg-brand-600 text-navy-900 font-bold py-3 text-sm disabled:opacity-50 transition-colors"
      >
        {pending ? "Enviando..." : "Quero saber mais →"}
      </button>
      <p className="text-xs text-navy-300 text-center">
        Sem compromisso — a gente te chama pra explicar melhor.
      </p>
    </form>
  );
}

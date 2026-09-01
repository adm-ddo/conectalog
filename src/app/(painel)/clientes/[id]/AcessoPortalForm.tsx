"use client";

import { useActionState } from "react";
import { definirAcessoPortal } from "../actions";

export default function AcessoPortalForm({
  clienteId,
  loginAtual,
}: {
  clienteId: number;
  loginAtual: string | null;
}) {
  const acaoComId = definirAcessoPortal.bind(null, clienteId);
  const [state, formAction, pending] = useActionState(acaoComId, undefined);

  return (
    <form action={formAction} className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-navy-900">Acesso ao portal do cliente</h2>
      <p className="text-xs text-stone-500">
        {loginAtual
          ? `Login atual: ${loginAtual}. Preencha abaixo pra trocar a senha ou o login.`
          : "Esse cliente ainda não tem acesso ao portal — crie um login pra ele acompanhar a escala."}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Login</span>
          <input
            name="loginPortal"
            defaultValue={loginAtual ?? ""}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">
            {loginAtual ? "Nova senha" : "Senha"}
          </span>
          <input
            name="senha"
            type="password"
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
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
        {pending ? "Salvando..." : loginAtual ? "Atualizar acesso" : "Criar acesso"}
      </button>
    </form>
  );
}

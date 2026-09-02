"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { entrar, reenviarVerificacaoEmail } from "./actions";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(entrar, undefined);
  const [reenviarState, reenviarAction, reenviarPending] = useActionState(
    reenviarVerificacaoEmail,
    undefined
  );
  const [email, setEmail] = useState("");

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm">
      <form
        action={formAction}
        className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm w-full"
      >
        <div>
          <h1 className="text-xl font-semibold text-navy-900">Entrar</h1>
          <p className="text-sm text-stone-500 mt-1">
            Painel da cooperativa ·{" "}
            <Link href="/cadastro" className="text-brand-700 underline">
              Criar conta
            </Link>
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">E-mail</label>
          <input
            name="email"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-stone-500">Senha</label>
            <Link href="/recuperar-senha" className="text-xs text-brand-700 underline">
              Esqueci minha senha
            </Link>
          </div>
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

      {state?.naoVerificado && (
        <form
          action={reenviarAction}
          className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4"
        >
          <input type="hidden" name="email" value={email} />
          <p className="text-xs text-amber-800">
            Ainda não recebeu o link de confirmação, ou ele expirou?
          </p>
          {reenviarState?.sucesso ? (
            <p className="text-xs text-brand-700">
              Se esse e-mail estiver cadastrado, reenviamos o link agora.
            </p>
          ) : (
            <button
              type="submit"
              disabled={reenviarPending}
              className="text-xs font-medium text-brand-700 underline self-start disabled:opacity-50"
            >
              {reenviarPending ? "Reenviando..." : "Reenviar e-mail de confirmação"}
            </button>
          )}
        </form>
      )}
    </div>
  );
}

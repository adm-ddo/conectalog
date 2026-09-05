"use client";

import { useTransition } from "react";
import { marcarNotificacaoLida, responderNotificacaoEscala } from "./actions";

export default function NotificacoesBanner({
  notificacoes,
}: {
  notificacoes: { id: number; mensagem: string; escalaId: number | null }[];
}) {
  const [pending, startTransition] = useTransition();

  if (notificacoes.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {notificacoes.map((n) =>
        n.escalaId !== null ? (
          <div
            key={n.id}
            className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 flex flex-col gap-2 text-sm text-navy-900"
          >
            <span>🔔 {n.mensagem}</span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(() => responderNotificacaoEscala(n.id, n.escalaId!, "CONFIRMADO"))
                }
                className="text-xs font-semibold text-brand-700 hover:underline disabled:opacity-50"
              >
                Confirmar presença
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(() => responderNotificacaoEscala(n.id, n.escalaId!, "RECUSADO"))
                }
                className="text-xs text-stone-500 hover:underline disabled:opacity-50"
              >
                Não vou poder
              </button>
            </div>
          </div>
        ) : (
          <div
            key={n.id}
            className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 flex items-start justify-between gap-3 text-sm text-navy-900"
          >
            <span>🔔 {n.mensagem}</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => marcarNotificacaoLida(n.id))}
              className="shrink-0 text-xs text-brand-700 hover:underline disabled:opacity-50"
            >
              OK
            </button>
          </div>
        )
      )}
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { cancelarConvite } from "./actions";

export default function ConviteRow({
  conviteId,
  email,
  expiraEm,
}: {
  conviteId: number;
  email: string;
  expiraEm: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-stone-300 px-4 py-3">
      <div className="min-w-0 flex flex-col">
        <span className="text-sm text-stone-700 truncate">{email}</span>
        <span className="text-xs text-stone-500">Convite pendente · expira em {expiraEm}</span>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => cancelarConvite(conviteId))}
        className="shrink-0 text-xs text-red-600 hover:underline disabled:opacity-50"
      >
        Cancelar
      </button>
    </li>
  );
}

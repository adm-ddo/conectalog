"use client";

import Link from "next/link";
import { useTransition } from "react";
import { alternarAtivoMotoboy } from "./actions";

export default function MotoboyRow({
  motoboy,
}: {
  motoboy: {
    id: number;
    nomeCompleto: string;
    email: string;
    ativo: boolean;
    livre: boolean;
    temAcesso: boolean;
  };
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
      <Link href={`/motoboys/${motoboy.id}`} className="min-w-0 flex flex-col">
        <span className="text-sm font-semibold text-navy-900 truncate">
          {motoboy.nomeCompleto}
        </span>
        <span className="text-xs text-stone-500 truncate">
          {motoboy.email}
          {motoboy.livre && " · livre em qualquer cliente"}
          {!motoboy.temAcesso && " · ainda sem acesso ao app"}
        </span>
      </Link>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => alternarAtivoMotoboy(motoboy.id, !motoboy.ativo))}
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
          motoboy.ativo
            ? "bg-brand-100 text-brand-800 hover:bg-brand-200"
            : "bg-stone-100 text-stone-600 hover:bg-stone-200"
        }`}
      >
        {motoboy.ativo ? "Ativo" : "Inativo"}
      </button>
    </li>
  );
}

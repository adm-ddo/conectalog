"use client";

import { useTransition } from "react";
import { alternarAtivoMembro } from "./actions";

export default function MembroRow({
  usuarioId,
  nome,
  email,
  role,
  ativo,
  souEu,
}: {
  usuarioId: number;
  nome: string;
  email: string;
  role: "MASTER" | "GESTOR";
  ativo: boolean;
  souEu: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
      <div className="min-w-0 flex flex-col">
        <span className="text-sm font-semibold text-navy-900 truncate">
          {nome} {souEu && <span className="text-stone-400 font-normal">(você)</span>}
        </span>
        <span className="text-xs text-stone-500 truncate">
          {email} · {role === "MASTER" ? "Dono" : "Gestor"}
        </span>
      </div>
      {role !== "MASTER" && (
        <button
          type="button"
          disabled={pending || souEu}
          onClick={() => startTransition(() => alternarAtivoMembro(usuarioId, !ativo))}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
            ativo
              ? "bg-brand-100 text-brand-800 hover:bg-brand-200"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          {ativo ? "Ativo" : "Inativo"}
        </button>
      )}
    </li>
  );
}

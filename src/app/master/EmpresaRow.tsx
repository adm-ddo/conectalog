"use client";

import { useTransition } from "react";
import { entrarNaEmpresa } from "./actions";

export default function EmpresaRow({
  empresaId,
  nome,
  criadoEm,
  totalMotoboys,
  totalClientes,
}: {
  empresaId: number;
  nome: string;
  criadoEm: string;
  totalMotoboys: number;
  totalClientes: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
      <div className="min-w-0 flex flex-col">
        <span className="text-sm font-semibold text-navy-900 truncate">{nome}</span>
        <span className="text-xs text-stone-500">
          Desde {criadoEm} · {totalMotoboys} motoboy{totalMotoboys === 1 ? "" : "s"} ·{" "}
          {totalClientes} cliente{totalClientes === 1 ? "" : "s"}
        </span>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => entrarNaEmpresa(empresaId))}
        className="shrink-0 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold px-4 py-2 disabled:opacity-50 transition-colors"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </li>
  );
}

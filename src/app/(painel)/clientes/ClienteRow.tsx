"use client";

import Link from "next/link";
import { useTransition } from "react";
import { alternarAtivoCliente } from "./actions";

export default function ClienteRow({
  cliente,
}: {
  cliente: {
    id: number;
    nome: string;
    endereco: string | null;
    ativo: boolean;
    usaDiaria: boolean;
    resumoPreco: string;
    equipeIncompleta: boolean;
  };
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
      <Link href={`/clientes/${cliente.id}`} className="min-w-0 flex flex-col">
        <span className="text-sm font-semibold text-navy-900 truncate flex items-center gap-2">
          {cliente.nome}
          {cliente.equipeIncompleta && (
            <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-bold uppercase">
              Equipe incompleta
            </span>
          )}
        </span>
        <span className="text-xs text-stone-500 truncate">
          {cliente.endereco || "Sem endereço"} · {cliente.resumoPreco}
          {cliente.usaDiaria && " · diária"}
        </span>
      </Link>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => alternarAtivoCliente(cliente.id, !cliente.ativo))}
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
          cliente.ativo
            ? "bg-brand-100 text-brand-800 hover:bg-brand-200"
            : "bg-stone-100 text-stone-600 hover:bg-stone-200"
        }`}
      >
        {cliente.ativo ? "Ativo" : "Inativo"}
      </button>
    </li>
  );
}

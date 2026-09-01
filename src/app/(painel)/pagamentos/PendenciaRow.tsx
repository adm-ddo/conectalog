"use client";

import { useTransition } from "react";
import { fecharPagamento } from "./actions";

export default function PendenciaRow({
  motoboyId,
  nome,
  quantidadeTurnos,
  total,
}: {
  motoboyId: number;
  nome: string;
  quantidadeTurnos: number;
  total: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="min-w-0 flex flex-col">
        <span className="text-sm font-semibold text-navy-900 truncate">{nome}</span>
        <span className="text-xs text-stone-600">
          {quantidadeTurnos} turno{quantidadeTurnos === 1 ? "" : "s"} pra fechar · R$ {total}
        </span>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => fecharPagamento(motoboyId))}
        className="shrink-0 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold px-4 py-2 disabled:opacity-50 transition-colors"
      >
        {pending ? "Fechando..." : "Fechar pagamento"}
      </button>
    </li>
  );
}

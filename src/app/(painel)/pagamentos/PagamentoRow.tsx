"use client";

import { useTransition } from "react";
import { marcarPagamentoPago } from "./actions";

export default function PagamentoRow({
  pagamento,
}: {
  pagamento: {
    id: number;
    nomeMotoboy: string;
    periodoInicio: string;
    periodoFim: string;
    valorTotal: string;
    status: "PENDENTE" | "CONCLUIDO";
  };
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
      <div className="min-w-0 flex flex-col">
        <span className="text-sm font-semibold text-navy-900 truncate">
          {pagamento.nomeMotoboy}
        </span>
        <span className="text-xs text-stone-500">
          {pagamento.periodoInicio} – {pagamento.periodoFim} · R$ {pagamento.valorTotal}
        </span>
      </div>
      {pagamento.status === "CONCLUIDO" ? (
        <span className="shrink-0 rounded-full bg-brand-100 text-brand-800 px-3 py-1 text-xs font-semibold">
          Pago
        </span>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => marcarPagamentoPago(pagamento.id))}
          className="shrink-0 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-4 py-2 disabled:opacity-50 transition-colors"
        >
          {pending ? "Marcando..." : "Marcar como pago"}
        </button>
      )}
    </li>
  );
}

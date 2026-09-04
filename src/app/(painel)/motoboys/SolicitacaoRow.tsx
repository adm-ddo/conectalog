"use client";

import { useTransition } from "react";
import { aprovarSolicitacaoMotoboy, rejeitarSolicitacaoMotoboy } from "./actions";
import EquipamentoBadge from "@/components/EquipamentoBadge";
import type { TipoEquipamento } from "@/generated/prisma/enums";

export default function SolicitacaoRow({
  motoboy,
}: {
  motoboy: {
    id: number;
    nomeCompleto: string;
    email: string;
    telefoneCelular: string;
    tipoEquipamento: TipoEquipamento | null;
    data: string;
  };
}) {
  const [pending, startTransition] = useTransition();

  function rejeitar() {
    if (!window.confirm(`Recusar o pedido de ${motoboy.nomeCompleto}? O cadastro dele é apagado.`)) {
      return;
    }
    startTransition(() => rejeitarSolicitacaoMotoboy(motoboy.id));
  }

  return (
    <li className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="min-w-0 flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-navy-900 flex items-center gap-2">
          {motoboy.nomeCompleto}
          <EquipamentoBadge tipo={motoboy.tipoEquipamento} />
        </span>
        <span className="text-xs text-stone-500 truncate">
          {motoboy.email} · {motoboy.telefoneCelular} · pediu em {motoboy.data}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => aprovarSolicitacaoMotoboy(motoboy.id))}
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-1.5 disabled:opacity-50 transition-colors"
        >
          Aprovar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={rejeitar}
          className="text-xs text-red-600 hover:underline disabled:opacity-50"
        >
          Recusar
        </button>
      </div>
    </li>
  );
}

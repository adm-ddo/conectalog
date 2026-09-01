"use client";

import { useTransition } from "react";
import { escalarMotoboy } from "./actions";
import EquipamentoBadge from "@/components/EquipamentoBadge";
import type { TipoEquipamento, TurnoEscala } from "@/generated/prisma/enums";

export default function CandidatoRow({
  clienteId,
  motoboyId,
  nome,
  tipoEquipamento,
  data,
  turno,
}: {
  clienteId: number;
  motoboyId: number;
  nome: string;
  tipoEquipamento: TipoEquipamento | null;
  data: string;
  turno: TurnoEscala;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-stone-300 px-4 py-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm text-stone-700 truncate">{nome}</span>
        <EquipamentoBadge tipo={tipoEquipamento} />
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => escalarMotoboy(clienteId, motoboyId, data, turno))}
        className="shrink-0 text-xs font-semibold text-brand-700 hover:underline disabled:opacity-50"
      >
        {pending ? "Escalando..." : "+ Escalar"}
      </button>
    </li>
  );
}

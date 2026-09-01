"use client";

import { useTransition } from "react";
import { atualizarEquipamentoMotoboy } from "../actions";
import type { TipoEquipamento } from "@/generated/prisma/enums";

export default function EquipamentoSelector({
  motoboyId,
  tipoEquipamento,
}: {
  motoboyId: number;
  tipoEquipamento: TipoEquipamento | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-stone-500">Equipamento de entrega</span>
      <select
        defaultValue={tipoEquipamento ?? ""}
        disabled={pending}
        onChange={(e) =>
          startTransition(() =>
            atualizarEquipamentoMotoboy(
              motoboyId,
              e.target.value ? (e.target.value as TipoEquipamento) : null
            )
          )
        }
        className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
      >
        <option value="">Não informado</option>
        <option value="BAG">Bag (mochila)</option>
        <option value="BAU_PEQUENO">Baú pequeno</option>
        <option value="BAU_MEDIO">Baú médio</option>
        <option value="BAU_GRANDE">Baú grande (pizza 45cm)</option>
      </select>
    </label>
  );
}

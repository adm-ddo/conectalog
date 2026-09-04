"use client";

import { useTransition } from "react";
import { atualizarFrequenciaPagamento } from "../actions";
import type { FrequenciaPagamento } from "@/generated/prisma/enums";

export default function FrequenciaPagamentoToggle({
  motoboyId,
  frequencia,
}: {
  motoboyId: number;
  frequencia: FrequenciaPagamento;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex flex-col gap-1">
      <span className="text-stone-500 text-sm">Recebimento</span>
      <select
        defaultValue={frequencia}
        disabled={pending}
        onChange={(e) =>
          startTransition(() =>
            atualizarFrequenciaPagamento(motoboyId, e.target.value as FrequenciaPagamento)
          )
        }
        className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <option value="DIARIA">Free — recebe por turno (diário)</option>
        <option value="SEMANAL">Moto fixa — entra no fechamento semanal</option>
      </select>
    </label>
  );
}

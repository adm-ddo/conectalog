"use client";

import { useTransition } from "react";
import { alternarLiberacaoEquipe } from "./actions";

export default function ToggleLiberacaoEquipe({
  clienteId,
  motoboyId,
  liberado,
}: {
  clienteId: number;
  motoboyId: number;
  liberado: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 shrink-0">
      <input
        type="checkbox"
        defaultChecked={liberado}
        disabled={pending}
        onChange={(e) =>
          startTransition(() => alternarLiberacaoEquipe(clienteId, motoboyId, e.target.checked))
        }
        className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
      />
      <span className="text-xs text-stone-500">Na equipe</span>
    </label>
  );
}

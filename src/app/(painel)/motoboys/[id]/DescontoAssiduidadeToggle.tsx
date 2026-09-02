"use client";

import { useTransition } from "react";
import { alternarDescontoAssiduidade } from "../actions";

export default function DescontoAssiduidadeToggle({
  motoboyId,
  ativo,
}: {
  motoboyId: number;
  ativo: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm font-medium text-navy-900">
      <input
        type="checkbox"
        defaultChecked={ativo}
        disabled={pending}
        onChange={(e) =>
          startTransition(() => alternarDescontoAssiduidade(motoboyId, e.target.checked))
        }
        className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
      />
      Desconto automático por atraso
    </label>
  );
}

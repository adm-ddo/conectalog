"use client";

import { useState } from "react";
import { mascaraTelefone } from "@/lib/telefone";

/** Input de telefone com máscara automática "(DDD) NNNNN-NNNN" — a
 * pessoa digita só os números e o campo já formata sozinho. Guarda o
 * valor já formatado (não só os dígitos) porque é assim que queremos
 * que fique salvo e mostrado em todo lugar, sem precisar reformatar na
 * exibição pros cadastros novos. */
export default function CampoTelefone({
  name,
  defaultValue,
  required = false,
  className = "border border-stone-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand-500",
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
}) {
  const [valor, setValor] = useState(() => mascaraTelefone(defaultValue ?? ""));

  return (
    <input
      type="tel"
      inputMode="numeric"
      name={name}
      value={valor}
      onChange={(e) => setValor(mascaraTelefone(e.target.value))}
      placeholder="(11) 91234-5678"
      required={required}
      className={className}
    />
  );
}

"use client";

import { useState } from "react";

/** Input de dinheiro com vírgula automática — a pessoa digita só os
 * números (ex: "1234") e o campo já mostra "12,34". O valor de verdade
 * (com ponto, pronto pro FormData) vai num input escondido com o mesmo
 * `name`. Quando `opcional` e o campo fica vazio, o hidden também fica
 * vazio — o servidor trata isso como "sem valor" (herda o padrão). */
export default function CampoMoeda({
  name,
  label,
  defaultValue,
  opcional = false,
}: {
  name: string;
  label?: string;
  defaultValue?: number | null;
  opcional?: boolean;
}) {
  const [digitos, setDigitos] = useState(() =>
    defaultValue != null ? String(Math.round(defaultValue * 100)) : ""
  );

  const temValor = digitos !== "";
  const numero = temValor ? Number(digitos) / 100 : 0;
  const formatado = temValor
    ? numero.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "";

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDigitos(e.target.value.replace(/\D/g, ""));
  }

  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-xs text-stone-500">{label}</span>}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400 pointer-events-none">
          R$
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={formatado}
          onChange={onChange}
          placeholder={opcional ? "herda o padrão" : "0,00"}
          className="border border-stone-300 rounded-lg pl-9 pr-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <input type="hidden" name={name} value={temValor ? numero.toFixed(2) : ""} />
    </label>
  );
}

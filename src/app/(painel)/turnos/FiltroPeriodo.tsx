"use client";

import { useState } from "react";

const OPCOES = [
  { value: "TODOS", label: "Todos" },
  { value: "HOJE", label: "Hoje" },
  { value: "ONTEM", label: "Ontem" },
  { value: "PERSONALIZADO", label: "Escolher datas" },
] as const;

/** Só mostra os campos "De"/"Até" quando "Escolher datas" está
 * selecionado — em vez de deixar sempre visível (confuso) ou usar
 * auto-submit no form inteiro (submeteria antes do gestor conseguir
 * preencher as duas datas). */
export default function FiltroPeriodo({
  periodoInicial,
  inicioInicial,
  fimInicial,
}: {
  periodoInicial: string;
  inicioInicial: string;
  fimInicial: string;
}) {
  const [periodo, setPeriodo] = useState(periodoInicial);

  return (
    <>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">Período</label>
        <select
          name="periodo"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm min-w-[160px]"
        >
          {OPCOES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {periodo === "PERSONALIZADO" && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-500">De</label>
            <input
              type="date"
              name="inicio"
              defaultValue={inicioInicial}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-500">Até</label>
            <input
              type="date"
              name="fim"
              defaultValue={fimInicial}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </>
      )}
    </>
  );
}

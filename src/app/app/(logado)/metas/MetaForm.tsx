"use client";

import { useState, useTransition } from "react";
import { criarMeta } from "./actions";
import type { TipoMeta, PeriodoMeta } from "@/generated/prisma/enums";

export default function MetaForm() {
  const [tipo, setTipo] = useState<TipoMeta>("BANDAS");
  const [periodoTipo, setPeriodoTipo] = useState<PeriodoMeta>("SEMANAL");
  const [valorAlvo, setValorAlvo] = useState("");
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar() {
    setErro(null);
    startTransition(async () => {
      const resultado = await criarMeta({
        tipo,
        valorAlvo: Number(valorAlvo.replace(",", ".")),
        periodoTipo,
        periodoInicio: periodoInicio || undefined,
        periodoFim: periodoFim || undefined,
      });
      if (resultado?.erro) setErro(resultado.erro);
    });
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-navy-900">Criar meta</h2>

      <div className="flex gap-2">
        {(["BANDAS", "VALOR"] as const).map((opcao) => (
          <button
            key={opcao}
            type="button"
            onClick={() => setTipo(opcao)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
              tipo === opcao ? "bg-brand-600 text-white" : "bg-stone-100 text-stone-600"
            }`}
          >
            {opcao === "BANDAS" ? "Bandas" : "Valor (R$)"}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-stone-500">
          Meta de {tipo === "BANDAS" ? "bandas" : "R$"}
        </span>
        <input
          value={valorAlvo}
          onChange={(e) => setValorAlvo(e.target.value)}
          type="number"
          min="1"
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      <div className="flex gap-2">
        {(["SEMANAL", "MENSAL", "PERSONALIZADO"] as const).map((opcao) => (
          <button
            key={opcao}
            type="button"
            onClick={() => setPeriodoTipo(opcao)}
            className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium ${
              periodoTipo === opcao ? "bg-brand-600 text-white" : "bg-stone-100 text-stone-600"
            }`}
          >
            {opcao === "SEMANAL" ? "7 dias" : opcao === "MENSAL" ? "30 dias" : "Personalizado"}
          </button>
        ))}
      </div>

      {periodoTipo === "PERSONALIZADO" && (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-stone-500">Início</span>
            <input
              type="date"
              value={periodoInicio}
              onChange={(e) => setPeriodoInicio(e.target.value)}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-stone-500">Fim</span>
            <input
              type="date"
              value={periodoFim}
              onChange={(e) => setPeriodoFim(e.target.value)}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
        </div>
      )}

      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {erro}
        </p>
      )}

      <button
        type="button"
        onClick={enviar}
        disabled={pending || !valorAlvo}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors"
      >
        {pending ? "Salvando..." : "Criar meta"}
      </button>
    </div>
  );
}

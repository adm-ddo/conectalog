"use client";

import { useTransition } from "react";
import { fecharPagamento } from "./actions";

export type GrupoPendencia = {
  chave: string;
  label: string;
  turnoIds: number[];
  quantidadeTurnos: number;
  valorBruto: string;
};

export default function MotoboyPendenciaCard({
  motoboyId,
  nome,
  frequencia,
  grupos,
  descontosPendentes,
}: {
  motoboyId: number;
  nome: string;
  frequencia: "DIARIA" | "SEMANAL";
  grupos: GrupoPendencia[];
  descontosPendentes: string | null;
}) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-navy-900">{nome}</span>
        <span className="text-xs font-medium text-stone-500 bg-white rounded-full px-2 py-0.5 border border-stone-200">
          {frequencia === "DIARIA" ? "Recebimento diário" : "Recebimento semanal"}
        </span>
      </div>

      {descontosPendentes && (
        <p className="text-xs text-red-600">
          Desconto pendente de {descontosPendentes} (ocorrência/vale/atraso) — entra no próximo
          fechamento abaixo.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {grupos.map((g) => (
          <GrupoRow key={g.chave} motoboyId={motoboyId} grupo={g} />
        ))}
      </ul>
    </div>
  );
}

function GrupoRow({ motoboyId, grupo }: { motoboyId: number; grupo: GrupoPendencia }) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl bg-white border border-amber-100 px-3 py-2.5">
      <div className="min-w-0 flex flex-col">
        <span className="text-sm font-medium text-navy-900">{grupo.label}</span>
        <span className="text-xs text-stone-500">
          {grupo.quantidadeTurnos} turno{grupo.quantidadeTurnos === 1 ? "" : "s"} · R${" "}
          {grupo.valorBruto}
        </span>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => fecharPagamento(motoboyId, grupo.turnoIds))}
        className="shrink-0 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold px-4 py-2 disabled:opacity-50 transition-colors"
      >
        {pending ? "Fechando..." : "Fechar pagamento"}
      </button>
    </li>
  );
}

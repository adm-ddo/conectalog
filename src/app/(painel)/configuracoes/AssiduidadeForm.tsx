"use client";

import { useActionState } from "react";
import CampoMoeda from "@/components/CampoMoeda";
import { atualizarConfigAssiduidade } from "./actions";

export default function AssiduidadeForm({
  toleranciaAtrasoMinutos,
  valorDescontoAtrasoManha,
  valorDescontoAtrasoTarde,
  valorDescontoAtrasoNoite,
}: {
  toleranciaAtrasoMinutos: number;
  valorDescontoAtrasoManha: number;
  valorDescontoAtrasoTarde: number;
  valorDescontoAtrasoNoite: number;
}) {
  const [state, formAction, pending] = useActionState(atualizarConfigAssiduidade, undefined);

  return (
    <form action={formAction} className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-navy-900">Desconto por atraso (assiduidade)</h2>
      <p className="text-xs text-stone-500">
        Vale só pra motoboy com o desconto ligado no perfil dele (ver página de cada um). Chegando
        atrasado além da tolerância no horário do turno do cliente, o desconto do turno é
        aplicado sozinho no próximo pagamento.
      </p>

      <label className="flex flex-col gap-1 max-w-xs">
        <span className="text-xs text-stone-500">Tolerância (minutos)</span>
        <input
          name="toleranciaAtrasoMinutos"
          type="number"
          min="0"
          required
          defaultValue={toleranciaAtrasoMinutos}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CampoMoeda
          name="valorDescontoAtrasoManha"
          label="Desconto — turno da manhã"
          defaultValue={valorDescontoAtrasoManha}
        />
        <CampoMoeda
          name="valorDescontoAtrasoTarde"
          label="Desconto — turno da tarde"
          defaultValue={valorDescontoAtrasoTarde}
        />
        <CampoMoeda
          name="valorDescontoAtrasoNoite"
          label="Desconto — turno da noite"
          defaultValue={valorDescontoAtrasoNoite}
        />
      </div>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2.5 disabled:opacity-50 transition-colors"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}

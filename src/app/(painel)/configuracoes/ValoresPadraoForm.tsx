"use client";

import { useActionState } from "react";
import CampoMoeda from "@/components/CampoMoeda";
import { atualizarValoresPadrao } from "./actions";

export default function ValoresPadraoForm({
  valorBandaMotoboyPadrao,
  valorBandaClientePadrao,
}: {
  valorBandaMotoboyPadrao: number;
  valorBandaClientePadrao: number;
}) {
  const [state, formAction, pending] = useActionState(atualizarValoresPadrao, undefined);

  return (
    <form action={formAction} className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-navy-900">Valores padrão por banda</h2>
      <p className="text-xs text-stone-500">
        Usados quando um cliente não tem valor próprio configurado. Dá pra sobrescrever por
        cliente na página de cada um (inclusive trocar pro modelo de diária). Taxa extra não tem
        padrão — cada cliente define suas próprias faixas na página dele.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CampoMoeda
          name="valorBandaMotoboyPadrao"
          label="Banda — motoboy recebe"
          defaultValue={valorBandaMotoboyPadrao}
        />
        <CampoMoeda
          name="valorBandaClientePadrao"
          label="Banda — cooperativa cobra do cliente"
          defaultValue={valorBandaClientePadrao}
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
        {pending ? "Salvando..." : "Salvar valores"}
      </button>
    </form>
  );
}

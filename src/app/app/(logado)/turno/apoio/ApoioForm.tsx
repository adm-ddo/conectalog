"use client";

import { useState, useTransition } from "react";
import ContadorStepper from "@/components/ContadorStepper";
import { registrarApoio } from "./actions";

export default function ApoioForm({
  clientes,
}: {
  clientes: { id: number; nome: string }[];
}) {
  const [clienteId, setClienteId] = useState<number | null>(clientes[0]?.id ?? null);
  const [bandas, setBandas] = useState(0);
  const [taxasExtras, setTaxasExtras] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (clientes.length === 0) {
    return <p className="text-sm text-stone-600">Você não está liberado em nenhum outro cliente.</p>;
  }

  function enviar() {
    if (!clienteId) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await registrarApoio({
        clienteId,
        quantidadeBandas: bandas,
        quantidadeTaxasExtras: taxasExtras,
      });
      if (resultado?.erro) setErro(resultado.erro);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-stone-500">Em qual cliente você deu apoio?</span>
        <select
          value={clienteId ?? ""}
          onChange={(e) => setClienteId(Number(e.target.value))}
          className="border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </label>

      <ContadorStepper label="Bandas" valor={bandas} onChange={setBandas} />
      <ContadorStepper label="Taxas extras" valor={taxasExtras} onChange={setTaxasExtras} />

      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {erro}
        </p>
      )}

      <button
        type="button"
        onClick={enviar}
        disabled={pending}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-3 disabled:opacity-50 transition-colors"
      >
        {pending ? "Salvando..." : "Salvar apoio"}
      </button>
    </div>
  );
}

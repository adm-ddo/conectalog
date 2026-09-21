"use client";

import { useState, useTransition } from "react";
import { registrarChamadoIfood } from "./actions";
import CampoMoedaControlado from "@/components/CampoMoedaControlado";

export default function ChamadoIfoodForm({ token }: { token: string }) {
  const [numeroPedidoSaipos, setNumeroPedidoSaipos] = useState("");
  const [numeroPedidoIfood, setNumeroPedidoIfood] = useState("");
  const [valorIfood, setValorIfood] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar() {
    setErro(null);
    startTransition(async () => {
      const resultado = await registrarChamadoIfood(token, {
        numeroPedidoSaipos,
        numeroPedidoIfood,
        valorIfood,
      });
      if (resultado?.erro) setErro(resultado.erro);
    });
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-4">
      <p className="text-sm text-stone-600">
        Registre aqui o pedido que você mandou pelo iFood porque não tinha moto da cooperativa
        disponível — a diferença pro valor normal é abatida da sua fatura.
      </p>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-stone-500">Número do pedido no Saipos</span>
        <input
          type="text"
          value={numeroPedidoSaipos}
          onChange={(e) => setNumeroPedidoSaipos(e.target.value)}
          className="border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-stone-500">Número do pedido no iFood</span>
        <input
          type="text"
          value={numeroPedidoIfood}
          onChange={(e) => setNumeroPedidoIfood(e.target.value)}
          className="border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      <CampoMoedaControlado label="Valor cobrado pelo iFood" valor={valorIfood} onChange={setValorIfood} />

      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {erro}
        </p>
      )}

      <button
        type="button"
        onClick={enviar}
        disabled={pending}
        className="rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold py-3 disabled:opacity-50 transition-colors"
      >
        {pending ? "Salvando..." : "🍔 Registrar chamado iFood"}
      </button>
    </div>
  );
}

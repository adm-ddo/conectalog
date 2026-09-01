"use client";

import { useState, useTransition } from "react";
import { solicitarApoio } from "./actions";

export default function SolicitarApoioForm({ token }: { token: string }) {
  const [quantidade, setQuantidade] = useState(1);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar() {
    setErro(null);
    startTransition(async () => {
      const resultado = await solicitarApoio(token, quantidade);
      if (resultado?.erro) setErro(resultado.erro);
    });
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-4">
      <p className="text-sm text-stone-600">Quantas motos de apoio você precisa agora?</p>
      <div className="flex gap-2">
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setQuantidade(n)}
            className={`flex-1 rounded-lg py-3 text-lg font-bold ${
              quantidade === n ? "bg-brand-600 text-white" : "bg-stone-100 text-stone-600"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

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
        {pending ? "Enviando..." : "🆘 Solicitar apoio"}
      </button>
    </div>
  );
}

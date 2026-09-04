"use client";

import { useState, useTransition } from "react";
import { sairDaCooperativaMotoboy } from "./actions";

export default function AguardandoAprovacaoScreen({ empresaNome }: { empresaNome: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function cancelar() {
    if (
      !window.confirm(
        "Cancelar o pedido e voltar a ficar disponível pra outras cooperativas?"
      )
    ) {
      return;
    }
    startTransition(async () => {
      const resultado = await sairDaCooperativaMotoboy();
      if (resultado?.erro) setErro(resultado.erro);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex flex-col gap-1">
        <span className="text-2xl">⏳</span>
        <h1 className="text-lg font-semibold text-navy-900">Aguardando aprovação</h1>
        <p className="text-sm text-stone-600">
          Você pediu vaga em <strong>{empresaNome}</strong>. Assim que ela aprovar, você já
          consegue usar o app normalmente.
        </p>
      </div>
      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {erro}
        </p>
      )}
      <button
        type="button"
        onClick={cancelar}
        disabled={pending}
        className="text-sm text-stone-500 underline self-start disabled:opacity-50"
      >
        {pending ? "Cancelando..." : "Cancelar pedido"}
      </button>
    </div>
  );
}

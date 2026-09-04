"use client";

import { useState, useTransition } from "react";
import { sairDaCooperativaMotoboy } from "../actions";

export default function SairCooperativaButton() {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function sair() {
    if (
      !window.confirm(
        "Sair dessa cooperativa? Você volta a ficar disponível na prateleira pra qualquer cooperativa te chamar, ou pra pedir vaga em outra."
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
    <div className="flex flex-col items-center gap-1 pt-2">
      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {erro}
        </p>
      )}
      <button
        type="button"
        onClick={sair}
        disabled={pending}
        className="text-xs text-stone-400 underline disabled:opacity-50"
      >
        {pending ? "Saindo..." : "Sair dessa cooperativa"}
      </button>
    </div>
  );
}

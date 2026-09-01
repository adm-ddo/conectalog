"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { regenerarTokenCadastroMotoboy } from "./actions";

export default function LinkCadastroMotoboySection({ token }: { token: string | null }) {
  const [pending, startTransition] = useTransition();
  const [copiado, setCopiado] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current && token) {
      inputRef.current.value = `${window.location.origin}/app/cadastro/${token}`;
    }
  }, [token]);

  function copiar() {
    const valor = inputRef.current?.value;
    if (!valor) return;
    navigator.clipboard.writeText(valor).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-navy-900">Link de cadastro do motoboy</h2>
      <p className="text-xs text-stone-500">
        Manda esse link pros motoboys se cadastrarem — quem entra por ele já fica credenciado
        direto na sua cooperativa.
      </p>

      {token ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            ref={inputRef}
            readOnly
            defaultValue=""
            onFocus={(e) => e.target.select()}
            className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm bg-stone-50 text-stone-700"
          />
          <button
            type="button"
            onClick={copiar}
            className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 transition-colors"
          >
            {copiado ? "Copiado!" : "Copiar link"}
          </button>
        </div>
      ) : (
        <p className="text-sm text-stone-500">Nenhum link gerado ainda.</p>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => regenerarTokenCadastroMotoboy())}
        className="self-start text-xs text-stone-500 underline disabled:opacity-50"
      >
        {pending ? "Gerando..." : token ? "Gerar novo link (invalida o antigo)" : "Gerar link"}
      </button>
    </div>
  );
}

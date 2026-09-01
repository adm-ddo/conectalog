"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ContadorStepper from "@/components/ContadorStepper";
import { encerrarPeloCliente } from "./actions";

export default function EncerrarPeloClienteForm({
  token,
  turnoId,
  nomeMotoboy,
}: {
  token: string;
  turnoId: number;
  nomeMotoboy: string;
}) {
  const router = useRouter();
  const [bandas, setBandas] = useState(0);
  const [taxasExtras, setTaxasExtras] = useState(0);
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar() {
    if (nota === 0) return setErro("Selecione uma nota de 1 a 5 estrelas.");
    setErro(null);
    startTransition(async () => {
      const resultado = await encerrarPeloCliente({
        token,
        turnoId,
        quantidadeBandas: bandas,
        quantidadeTaxasExtras: taxasExtras,
        nota,
        comentario,
      });
      if (resultado?.erro) setErro(resultado.erro);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-stone-600">
        Quantas bandas o(a) <strong>{nomeMotoboy}</strong> fez aqui hoje?
      </p>
      <ContadorStepper label="Bandas" valor={bandas} onChange={setBandas} />
      <ContadorStepper label="Taxas extras" valor={taxasExtras} onChange={setTaxasExtras} />

      <div className="flex flex-col gap-2">
        <span className="text-sm text-stone-600">Como foi o atendimento dele?</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNota(n)}
              className={`text-3xl leading-none ${n <= nota ? "text-amber-400" : "text-stone-300"}`}
              aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-stone-500">
          Quer relatar algo? (opcional — atraso, comportamento, qualquer ocorrência)
        </span>
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={3}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {erro}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={pending}
          className="rounded-lg border border-stone-300 text-sm px-5 py-2.5 text-stone-700 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={enviar}
          disabled={pending}
          className="flex-1 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors"
        >
          {pending ? "Enviando..." : "Confirmar"}
        </button>
      </div>
    </div>
  );
}

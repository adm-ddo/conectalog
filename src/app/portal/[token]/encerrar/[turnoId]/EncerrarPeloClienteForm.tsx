"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ContadorStepper from "@/components/ContadorStepper";
import CampoMoedaControlado from "@/components/CampoMoedaControlado";
import { encerrarPeloCliente } from "./actions";

export default function EncerrarPeloClienteForm({
  token,
  turnoId,
  nomeMotoboy,
  taxasExtras,
}: {
  token: string;
  turnoId: number;
  nomeMotoboy: string;
  taxasExtras: { id: number; descricao: string }[];
}) {
  const router = useRouter();
  const [bandas, setBandas] = useState(0);
  const [quantidades, setQuantidades] = useState<Record<number, number>>({});
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [houveOcorrencia, setHouveOcorrencia] = useState(false);
  const [descricaoOcorrencia, setDescricaoOcorrencia] = useState("");
  const [valorDesconto, setValorDesconto] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar() {
    if (nota === 0) return setErro("Selecione uma nota de 1 a 5 estrelas.");
    if (houveOcorrencia && !descricaoOcorrencia.trim()) {
      return setErro("Descreva o que aconteceu na ocorrência.");
    }
    setErro(null);
    startTransition(async () => {
      const resultado = await encerrarPeloCliente({
        token,
        turnoId,
        quantidadeBandas: bandas,
        taxasExtras: taxasExtras.map((t) => ({ itemId: t.id, quantidade: quantidades[t.id] ?? 0 })),
        nota,
        comentario,
        houveOcorrencia,
        descricaoOcorrencia,
        valorDesconto,
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
      {taxasExtras.map((t) => (
        <ContadorStepper
          key={t.id}
          label={t.descricao}
          valor={quantidades[t.id] ?? 0}
          onChange={(v) => setQuantidades((prev) => ({ ...prev, [t.id]: v }))}
        />
      ))}

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
        <span className="text-xs text-stone-500">Comentário geral (opcional)</span>
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={2}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
        <label className="flex items-center gap-2 text-sm font-medium text-red-800">
          <input
            type="checkbox"
            checked={houveOcorrencia}
            onChange={(e) => setHouveOcorrencia(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-red-600 focus:ring-red-500"
          />
          Houve alguma ocorrência com esse motoboy? (pedido com problema, cobrança não feita,
          dinheiro não devolvido, entrega que chegou errada)
        </label>

        {houveOcorrencia && (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-red-700">O que aconteceu?</span>
              <textarea
                value={descricaoOcorrencia}
                onChange={(e) => setDescricaoOcorrencia(e.target.value)}
                rows={3}
                className="border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </label>
            <CampoMoedaControlado
              label="Valor a descontar do motoboy (se houver)"
              valor={valorDesconto}
              onChange={setValorDesconto}
            />
            <p className="text-xs text-red-700">
              Esse valor é abatido do que ele recebe no próximo fechamento de pagamento, e fica
              registrado o motivo.
            </p>
          </>
        )}
      </div>

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

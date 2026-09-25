"use client";

import { useState, useTransition } from "react";
import { marcarProblemaTecnico } from "./actions";
import { formatarMoeda } from "@/lib/valores";

/** Botão pro gestor remover a diária garantida de um turno quando o
 * motoboy foi embora antes da hora por um problema técnico (pane na
 * moto) ou pessoal/familiar — diferente de InvalidarFraudeForm (que é
 * uma acusação grave), aqui é um ajuste operacional legítimo: o motoboy
 * trabalhou de verdade, só não completou o turno inteiro, então a
 * cooperativa paga/cobra só pelas bandas que ele de fato fez, sem a
 * diária cheia. Por isso o tom é âmbar, não vermelho. */
export default function ProblemaTecnicoForm({
  turnoId,
  turnoLabel,
  motoboyNome,
  bandasIncluidas,
  valorGarantidoMotoboy,
  quantidadeBandas,
}: {
  turnoId: number;
  turnoLabel: string;
  motoboyNome: string;
  bandasIncluidas: number;
  valorGarantidoMotoboy: number;
  quantidadeBandas: number;
}) {
  const [aberto, setAberto] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmarProblemaTecnico() {
    if (!observacao.trim()) {
      setErro("Descreva o que aconteceu (pane na moto, imprevisto pessoal etc.).");
      return;
    }
    if (
      !window.confirm(
        `Remover a diária garantida desse turno de ${motoboyNome} e cobrar/pagar só pelas ${quantidadeBandas} banda${quantidadeBandas === 1 ? "" : "s"} que ele fez?`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const resultado = await marcarProblemaTecnico(turnoId, observacao);
      setErro(resultado?.erro ?? null);
    });
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="self-start text-xs text-amber-800 hover:underline"
      >
        ⚠️ Problema técnico nesse turno?
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-400 bg-amber-50 p-5 flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-amber-900">⚠️ Problema técnico</h2>
        <p className="text-xs text-amber-800 mt-1">
          Use quando {motoboyNome} veio pra fazer a diária da {turnoLabel} (garantido de até{" "}
          {bandasIncluidas} entregas, R$ {formatarMoeda(valorGarantidoMotoboy)}) mas precisou ir
          embora antes da hora por pane na moto ou imprevisto pessoal/familiar. Isso remove a
          diária e recalcula esse turno só pelas {quantidadeBandas} banda
          {quantidadeBandas === 1 ? "" : "s"} que ele realmente fez, pela tarifa normal — nem a
          cooperativa paga, nem cobra do cliente a diária cheia.
        </p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-amber-800">O que aconteceu (obrigatório)</span>
        <textarea
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          rows={3}
          placeholder="Ex.: moto quebrou na estrada, motoboy precisou ir pro hospital com familiar."
          className="border border-amber-300 rounded-lg px-3 py-2 text-sm bg-white"
        />
      </label>

      {erro && <p className="text-xs text-red-700 font-medium">{erro}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={confirmarProblemaTecnico}
          className="self-start rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2 disabled:opacity-50 transition-colors"
        >
          {pending ? "Salvando..." : "Remover diária e recalcular"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setAberto(false)}
          className="self-start rounded-lg border border-amber-300 text-amber-800 hover:bg-amber-100 text-xs font-semibold px-4 py-2 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

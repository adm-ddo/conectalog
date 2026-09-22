"use client";

import { useState, useTransition } from "react";
import { invalidarTurnoPorFraude } from "./actions";

/** Botão de última instância pro gestor invalidar o turno inteiro por
 * suspeita de fraude — diferente de CorrigirContagemForm (que assume boa-fé
 * dos dois lados e só ajusta um número), aqui a acusação é grave: o
 * motoboy alegou ter trabalhado e o cliente nega. Zera o valor do turno e
 * fica registrado como alerta permanente no perfil dele (ver
 * AlertasFraudeSection, motoboys/[id]/page.tsx) — por isso pede confirmação
 * extra (window.confirm) e um motivo obrigatório, diferente da observação
 * opcional de qualquer outro formulário desta tela. */
export default function InvalidarFraudeForm({
  turnoId,
  turnoLabel,
  motoboyNome,
}: {
  turnoId: number;
  turnoLabel: string;
  motoboyNome: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmarInvalidacao() {
    if (!motivo.trim()) {
      setErro("Descreva o motivo da suspeita de fraude.");
      return;
    }
    if (
      !window.confirm(
        `Invalidar esse turno de ${motoboyNome} por fraude? O valor vira R$ 0,00 e fica um alerta permanente no perfil dele. Essa ação não pode ser desfeita.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const resultado = await invalidarTurnoPorFraude(turnoId, motivo);
      setErro(resultado?.erro ?? null);
    });
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="self-start text-xs text-red-700 hover:underline"
      >
        Suspeita de fraude nesse turno?
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-red-400 bg-red-950 p-5 flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-white">🚩 Invalidar turno por fraude</h2>
        <p className="text-xs text-red-200 mt-1">
          Use quando {motoboyNome} alegou ter trabalhado na {turnoLabel} (ou fez uma contagem) mas o
          cliente nega — não é uma diferença de contagem de boa-fé, é uma tentativa de golpe. O
          turno inteiro passa a valer R$ 0,00 e o motoboy recebe um alerta permanente e visível no
          perfil dele.
        </p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-red-200">Motivo (obrigatório)</span>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          placeholder="Ex.: cliente afirma que o motoboy nunca apareceu no restaurante; motoboy alegou 10 bandas."
          className="border border-red-300 rounded-lg px-3 py-2 text-sm bg-white"
        />
      </label>

      {erro && <p className="text-xs text-red-200 font-medium">{erro}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={confirmarInvalidacao}
          className="self-start rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 disabled:opacity-50 transition-colors"
        >
          {pending ? "Invalidando..." : "Invalidar turno por fraude"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setAberto(false)}
          className="self-start rounded-lg border border-red-300 text-red-100 hover:bg-red-900 text-xs font-semibold px-4 py-2 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

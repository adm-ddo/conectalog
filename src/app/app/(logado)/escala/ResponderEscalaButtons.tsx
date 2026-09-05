"use client";

import { useTransition } from "react";
import { responderEscala } from "./actions";
import type { StatusConfirmacaoEscala } from "@/generated/prisma/enums";

export default function ResponderEscalaButtons({
  escalaId,
  statusAtual,
}: {
  escalaId: number;
  statusAtual: StatusConfirmacaoEscala;
}) {
  const [pending, startTransition] = useTransition();

  function responder(resposta: StatusConfirmacaoEscala) {
    startTransition(() => responderEscala(escalaId, resposta));
  }

  if (statusAtual === "CONFIRMADO") {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-medium text-brand-700">✓ Confirmado</span>
        <button
          type="button"
          disabled={pending}
          onClick={() => responder("RECUSADO")}
          className="text-xs text-stone-400 hover:underline disabled:opacity-50"
        >
          mudar
        </button>
      </div>
    );
  }

  if (statusAtual === "RECUSADO") {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-medium text-red-600">Não vai poder</span>
        <button
          type="button"
          disabled={pending}
          onClick={() => responder("CONFIRMADO")}
          className="text-xs text-stone-400 hover:underline disabled:opacity-50"
        >
          mudar
        </button>
      </div>
    );
  }

  if (statusAtual === "EXPIRADA") {
    return (
      <span className="text-xs font-medium text-amber-600">
        Essa escala caiu — você não confirmou a tempo
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3 shrink-0">
      <button
        type="button"
        disabled={pending}
        onClick={() => responder("CONFIRMADO")}
        className="text-xs font-semibold text-brand-700 hover:underline disabled:opacity-50"
      >
        Confirmar
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => responder("RECUSADO")}
        className="text-xs text-stone-500 hover:underline disabled:opacity-50"
      >
        Não vou poder
      </button>
    </div>
  );
}

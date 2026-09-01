"use client";

import { useTransition } from "react";
import { manterEscalaSemanaPassada } from "./actions";
import type { TurnoEscala } from "@/generated/prisma/enums";

export default function ManterEscalaAnteriorBanner({
  clienteId,
  turno,
  data,
  nomes,
}: {
  clienteId: number;
  turno: TurnoEscala;
  data: string;
  nomes: string[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 flex flex-col gap-2 text-sm">
      <p className="text-navy-900">
        Na mesma data da semana passada estavam escalados: <strong>{nomes.join(", ")}</strong>.
        Quer manter a mesma escala ou montar do zero?
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() => manterEscalaSemanaPassada(clienteId, turno, data))
          }
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-4 py-2 disabled:opacity-50 transition-colors"
        >
          {pending ? "Aplicando..." : "Manter a mesma escala"}
        </button>
        <span className="text-xs text-stone-500 self-center">
          Ou escolha manualmente na lista abaixo pra montar do zero.
        </span>
      </div>
    </div>
  );
}

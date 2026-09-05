"use client";

import { useTransition } from "react";
import Link from "next/link";
import { escalarMotoboy } from "./actions";
import EquipamentoBadge from "@/components/EquipamentoBadge";
import type { TipoEquipamento, TurnoEscala } from "@/generated/prisma/enums";

export default function CandidatoRow({
  clienteId,
  motoboyId,
  nome,
  tipoEquipamento,
  data,
  turno,
  podeVerPerfil,
  jaChegou,
}: {
  clienteId: number;
  motoboyId: number;
  nome: string;
  tipoEquipamento: TipoEquipamento | null;
  data: string;
  turno: TurnoEscala;
  podeVerPerfil: boolean;
  /** Preenchido só na seção "Chegaram sem estar escalados" — ele já tem
   * um Turno de verdade hoje aqui, só falta formalizar a escala (que já
   * nasce confirmada, porque ele já tá lá — ver escalarSeNovo). */
  jaChegou?: { texto: string; ativoAgora: boolean };
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li
      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
        jaChegou ? "border-amber-300 bg-amber-50" : "border-dashed border-stone-300"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {jaChegou && (
          <span
            className={`h-2.5 w-2.5 rounded-full shrink-0 ${jaChegou.ativoAgora ? "bg-brand-500" : "bg-stone-300"}`}
          />
        )}
        {podeVerPerfil ? (
          <Link href={`/motoboys/${motoboyId}`} className="text-sm text-stone-700 hover:underline truncate">
            {nome}
          </Link>
        ) : (
          <span className="text-sm text-stone-700 truncate">{nome}</span>
        )}
        <EquipamentoBadge tipo={tipoEquipamento} />
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {jaChegou && <span className="text-xs text-amber-800">{jaChegou.texto}</span>}
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => escalarMotoboy(clienteId, motoboyId, data, turno))}
          className="text-xs font-semibold text-brand-700 hover:underline disabled:opacity-50"
        >
          {pending ? "Escalando..." : "+ Escalar"}
        </button>
      </div>
    </li>
  );
}

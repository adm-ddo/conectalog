"use client";

import { useTransition } from "react";
import Link from "next/link";
import { removerEscala } from "./actions";
import EquipamentoBadge from "@/components/EquipamentoBadge";
import type { TipoEquipamento } from "@/generated/prisma/enums";

export default function EscalaRow({
  escalaId,
  motoboyId,
  nome,
  tipoEquipamento,
  chegou,
  horaChegada,
  podeVerPerfil,
}: {
  escalaId: number;
  motoboyId: number;
  nome: string;
  tipoEquipamento: TipoEquipamento | null;
  chegou: boolean;
  horaChegada: string | null;
  podeVerPerfil: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`h-2.5 w-2.5 rounded-full shrink-0 ${chegou ? "bg-brand-500" : "bg-stone-300"}`}
        />
        {podeVerPerfil ? (
          <Link
            href={`/motoboys/${motoboyId}`}
            className="text-sm font-medium text-navy-900 hover:underline truncate"
          >
            {nome}
          </Link>
        ) : (
          <span className="text-sm font-medium text-navy-900 truncate">{nome}</span>
        )}
        <EquipamentoBadge tipo={tipoEquipamento} />
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-stone-500">
          {chegou ? `Chegou às ${horaChegada}` : "Aguardando"}
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => removerEscala(escalaId))}
          className="text-xs text-red-600 hover:underline disabled:opacity-50"
        >
          Remover
        </button>
      </div>
    </li>
  );
}

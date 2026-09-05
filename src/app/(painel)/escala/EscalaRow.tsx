"use client";

import { useTransition } from "react";
import Link from "next/link";
import { removerEscala } from "./actions";
import EquipamentoBadge from "@/components/EquipamentoBadge";
import type { TipoEquipamento, StatusConfirmacaoEscala } from "@/generated/prisma/enums";

const LABEL_CONFIRMACAO: Record<StatusConfirmacaoEscala, { texto: string; classe: string }> = {
  CONFIRMADO: { texto: "✓ Confirmou", classe: "text-brand-700" },
  RECUSADO: { texto: "Não vai poder", classe: "text-red-600" },
  PENDENTE: { texto: "Aguardando resposta", classe: "text-stone-400" },
};

export default function EscalaRow({
  escalaId,
  motoboyId,
  nome,
  tipoEquipamento,
  chegou,
  ativoAgora,
  horaChegada,
  statusConfirmacao,
  podeVerPerfil,
}: {
  escalaId: number;
  motoboyId: number;
  nome: string;
  tipoEquipamento: TipoEquipamento | null;
  chegou: boolean;
  ativoAgora: boolean;
  horaChegada: string | null;
  statusConfirmacao: StatusConfirmacaoEscala;
  podeVerPerfil: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const confirmacao = LABEL_CONFIRMACAO[statusConfirmacao];

  return (
    <li className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`h-2.5 w-2.5 rounded-full shrink-0 ${ativoAgora ? "bg-brand-500" : "bg-stone-300"}`}
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
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 shrink-0">
        <span className={`text-xs font-medium ${confirmacao.classe}`}>{confirmacao.texto}</span>
        <span className="text-xs text-stone-500">
          {ativoAgora
            ? `Ativo desde ${horaChegada}`
            : chegou
              ? `Chegou às ${horaChegada}`
              : "Ainda não chegou"}
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

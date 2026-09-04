"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { alternarAtivoMotoboy, excluirMotoboy } from "./actions";
import EquipamentoBadge from "@/components/EquipamentoBadge";
import type { TipoEquipamento } from "@/generated/prisma/enums";

export default function MotoboyRow({
  motoboy,
}: {
  motoboy: {
    id: number;
    nomeCompleto: string;
    email: string;
    ativo: boolean;
    livre: boolean;
    ehGestor: boolean;
    temAcesso: boolean;
    tipoEquipamento: TipoEquipamento | null;
  };
}) {
  const [pending, startTransition] = useTransition();
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

  function excluir() {
    if (
      !window.confirm(
        `Excluir ${motoboy.nomeCompleto} permanentemente? Isso só é possível porque ele ainda não tem turnos ou pagamentos registrados. Essa ação não pode ser desfeita.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const resultado = await excluirMotoboy(motoboy.id);
      setErroExclusao(resultado?.erro ?? null);
    });
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/motoboys/${motoboy.id}`} className="min-w-0 flex flex-col gap-1">
          <span className="text-sm font-semibold text-navy-900 truncate flex items-center gap-2">
            {motoboy.nomeCompleto}
            <EquipamentoBadge tipo={motoboy.tipoEquipamento} />
          </span>
          <span className="text-xs text-stone-500 truncate">
            {motoboy.email}
            {motoboy.livre && " · Livre em qualquer cliente"}
            {motoboy.ehGestor && " · Gestor"}
            {!motoboy.temAcesso && " · ainda sem acesso ao app"}
          </span>
        </Link>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => alternarAtivoMotoboy(motoboy.id, !motoboy.ativo))}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
              motoboy.ativo
                ? "bg-brand-100 text-brand-800 hover:bg-brand-200"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {motoboy.ativo ? "Ativo" : "Bloqueado"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={excluir}
            className="text-xs text-red-600 hover:underline disabled:opacity-50"
          >
            Excluir
          </button>
        </div>
      </div>
      {erroExclusao && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {erroExclusao}
        </p>
      )}
    </li>
  );
}

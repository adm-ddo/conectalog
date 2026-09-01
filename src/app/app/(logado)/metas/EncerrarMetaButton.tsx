"use client";

import { useTransition } from "react";
import { encerrarMeta } from "./actions";

export default function EncerrarMetaButton({ metaId }: { metaId: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => encerrarMeta(metaId))}
      className="text-xs text-stone-500 underline underline-offset-2 disabled:opacity-50"
    >
      Encerrar
    </button>
  );
}

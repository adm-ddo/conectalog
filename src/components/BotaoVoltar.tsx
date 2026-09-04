"use client";

import { useRouter } from "next/navigation";

/** Volta pra tela anterior de verdade (histórico do navegador), não um
 * link fixo — importante porque essas telas de detalhe agora são
 * acessadas de vários lugares diferentes (lista, escala, dashboard...),
 * então "voltar" precisa levar pra onde a pessoa realmente estava, não
 * sempre pro mesmo lugar. */
export default function BotaoVoltar({ label = "Voltar" }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="text-xs text-stone-500 hover:underline self-start"
    >
      ← {label}
    </button>
  );
}

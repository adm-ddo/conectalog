"use client";

import Link from "next/link";

// Mesma rede de segurança do painel, só que pro app do motoboy — evita
// que ele veja a tela crua de erro do navegador no celular.
export default function AppLogadoError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <span className="text-3xl">😕</span>
      <h1 className="text-lg font-semibold text-navy-900">Essa tela não carregou</h1>
      <p className="text-sm text-stone-600 max-w-sm">
        Pode ter sido só uma falha passageira. Tenta de novo — se continuar acontecendo, avisa a
        cooperativa.
      </p>
      {error.digest && <p className="text-xs text-stone-400">Código: {error.digest}</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2.5 transition-colors"
        >
          Tentar de novo
        </button>
        <Link href="/app/inicio" className="text-sm text-stone-500 underline">
          Voltar pro início
        </Link>
      </div>
    </div>
  );
}

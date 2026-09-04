"use client";

// Rede de segurança pra tudo que não é painel nem app do motoboy (site,
// login, master, cadastro, portal da empresa cliente).
export default function RootError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 py-16 text-center bg-white">
      <span className="text-3xl">😕</span>
      <h1 className="text-lg font-semibold text-navy-900">Essa página não carregou</h1>
      <p className="text-sm text-stone-600 max-w-sm">
        Pode ter sido só uma falha passageira. Tenta de novo em alguns segundos.
      </p>
      {error.digest && <p className="text-xs text-stone-400">Código: {error.digest}</p>}
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2.5 transition-colors"
      >
        Tentar de novo
      </button>
    </div>
  );
}

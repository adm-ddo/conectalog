"use client";

import { sairMotoboy } from "./actions";

export default function AppHeader({
  nome,
  logoUrl,
  empresaNome,
}: {
  nome: string;
  logoUrl: string | null;
  empresaNome: string;
}) {
  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo público hospedado no Blob
            <img src={logoUrl} alt={empresaNome} className="h-8 w-8 rounded-lg object-contain" />
          ) : (
            <span className="h-8 w-8 rounded-lg bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
              {empresaNome.slice(0, 1)}
            </span>
          )}
          <div className="min-w-0 flex flex-col leading-tight">
            <span className="text-sm font-semibold text-navy-900 truncate">{empresaNome}</span>
            <span className="text-xs text-stone-500 truncate">Olá, {nome.split(" ")[0]}</span>
          </div>
        </div>
        <form action={sairMotoboy}>
          <button type="submit" className="text-xs text-stone-500 underline underline-offset-2">
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}

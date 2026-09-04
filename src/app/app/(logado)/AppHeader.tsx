"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sairMotoboy } from "./actions";

const LINKS = [
  { href: "/app/inicio", label: "Início" },
  { href: "/app/escala", label: "Escala" },
  { href: "/app/relatorio", label: "Relatório" },
  { href: "/app/metas", label: "Minhas metas" },
];

export default function AppHeader({
  nome,
  logoUrl,
  empresaNome,
  temContaPainel,
}: {
  nome: string;
  logoUrl: string | null;
  empresaNome: string;
  temContaPainel: boolean;
}) {
  const pathname = usePathname();

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
        <div className="flex items-center gap-2 shrink-0">
          {temContaPainel && (
            <Link
              href="/dashboard"
              className="text-xs text-brand-700 underline underline-offset-2 whitespace-nowrap"
            >
              Painel
            </Link>
          )}
          <form action={sairMotoboy}>
            <button
              type="submit"
              className="text-xs text-stone-500 underline underline-offset-2 whitespace-nowrap"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
      <nav className="max-w-md mx-auto px-4 pb-2 flex items-center gap-1">
        {LINKS.map((link) => {
          const ativo = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex-1 text-center rounded-lg px-1.5 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                ativo ? "bg-brand-100 text-brand-800" : "text-stone-500 hover:bg-stone-100"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

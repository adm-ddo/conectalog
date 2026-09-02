"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sair, voltarAoMaster } from "./actions";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/escala", label: "Escala" },
  { href: "/clientes", label: "Clientes" },
  { href: "/motoboys", label: "Motoboys" },
  { href: "/pagamentos", label: "Pagamentos" },
  { href: "/equipe", label: "Equipe", masterOnly: true },
  { href: "/configuracoes", label: "Configurações", masterOnly: true },
];

export default function PainelHeader({
  empresaNome,
  usuarioNome,
  vendoComoSuperAdmin,
  logoUrl,
  ehMaster,
}: {
  empresaNome: string;
  usuarioNome: string;
  vendoComoSuperAdmin: boolean;
  logoUrl: string | null;
  ehMaster: boolean;
}) {
  const pathname = usePathname();
  const links = LINKS.filter((link) => !link.masterOnly || ehMaster);

  return (
    <header className="bg-navy-900 text-white">
      {vendoComoSuperAdmin && (
        <div className="bg-amber-500 text-navy-900 text-sm font-semibold px-4 py-2 flex items-center justify-center gap-3">
          <span>Você está vendo como dono de {empresaNome}</span>
          <form action={voltarAoMaster}>
            <button type="submit" className="underline underline-offset-2">
              Voltar pra lista de cooperativas
            </button>
          </form>
        </div>
      )}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 min-w-0">
          <Link href="/dashboard" className="flex items-center gap-2 font-black text-lg tracking-tight shrink-0">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- logo como data URL, next/image não se aplica aqui
              <img src={logoUrl} alt={empresaNome} className="h-8 w-8 rounded-lg object-contain bg-white/10" />
            )}
            Conecta<span className="text-brand-400">Log</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const ativo = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    ativo
                      ? "bg-white/15 text-white"
                      : "text-navy-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:block text-sm text-navy-200 truncate max-w-[160px]">
            {empresaNome}
          </span>
          <span className="hidden sm:block text-navy-500">·</span>
          <span className="text-sm text-navy-200 truncate max-w-[120px]">{usuarioNome}</span>
          <form action={sair}>
            <button
              type="submit"
              className="text-sm text-navy-200 hover:text-white underline underline-offset-2"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
      <nav className="md:hidden flex items-center gap-1 overflow-x-auto px-4 pb-2">
        {LINKS.map((link) => {
          const ativo = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                ativo ? "bg-white/15 text-white" : "text-navy-200 hover:bg-white/10 hover:text-white"
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

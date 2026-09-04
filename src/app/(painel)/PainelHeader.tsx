"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sair, voltarAoMaster } from "./actions";

// Gestor de campo vê só um subconjunto bem menor (dashboard/escala/minha
// equipe, filtrados pros clientes dele) — nunca outros clientes,
// motoboys da cooperativa inteira, pagamentos, relatórios, turnos, equipe
// (convites) ou configurações. `gestorCampo: false` marca links que ficam
// escondidos pra esse papel; os sem essa flag valem pros dois.
const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/escala", label: "Escala" },
  { href: "/minha-equipe", label: "Minha equipe", soGestorCampo: true },
  { href: "/turnos", label: "Turnos", gestorCampo: false },
  { href: "/clientes", label: "Clientes", gestorCampo: false },
  { href: "/motoboys", label: "Motoboys", gestorCampo: false },
  { href: "/pagamentos", label: "Pagamentos", gestorCampo: false },
  { href: "/relatorios", label: "Relatórios", gestorCampo: false },
  { href: "/equipe", label: "Equipe", masterOnly: true, gestorCampo: false },
  { href: "/configuracoes", label: "Configurações", masterOnly: true, gestorCampo: false },
];

export default function PainelHeader({
  empresaNome,
  usuarioNome,
  vendoComoSuperAdmin,
  logoUrl,
  ehMaster,
  ehGestorCampo,
  email,
  solicitacoesPendentes,
}: {
  empresaNome: string;
  usuarioNome: string;
  vendoComoSuperAdmin: boolean;
  logoUrl: string | null;
  ehMaster: boolean;
  ehGestorCampo: boolean;
  email: string;
  solicitacoesPendentes: number;
}) {
  const pathname = usePathname();
  const links = LINKS.filter((link) => {
    if (link.soGestorCampo) return ehGestorCampo;
    if (ehGestorCampo && link.gestorCampo === false) return false;
    return !link.masterOnly || ehMaster;
  });

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
        <div className="flex items-center gap-4 lg:gap-6 min-w-0">
          <Link href="/dashboard" className="flex items-center gap-2 font-black text-lg tracking-tight shrink-0">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- logo como data URL, next/image não se aplica aqui
              <img src={logoUrl} alt={empresaNome} className="h-8 w-8 rounded-lg object-contain bg-white/10" />
            )}
            Conecta<span className="text-brand-400">Log</span>
          </Link>
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto min-w-0">
            {links.map((link) => {
              const ativo = pathname.startsWith(link.href);
              const pendentes = link.href === "/motoboys" ? solicitacoesPendentes : 0;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    ativo
                      ? "bg-white/15 text-white"
                      : "text-navy-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {link.label}
                  {pendentes > 0 && (
                    <span className="rounded-full bg-red-500 text-white text-[10px] font-bold leading-none px-1.5 py-0.5">
                      {pendentes}
                    </span>
                  )}
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
          {ehGestorCampo && (
            <Link
              href={`/app/entrar?email=${encodeURIComponent(email)}`}
              className="text-sm text-navy-200 hover:text-white underline underline-offset-2 shrink-0"
            >
              App Motoboy
            </Link>
          )}
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
      <nav className="lg:hidden flex items-center gap-1 overflow-x-auto px-4 pb-2">
        {links.map((link) => {
          const ativo = pathname.startsWith(link.href);
          const pendentes = link.href === "/motoboys" ? solicitacoesPendentes : 0;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                ativo ? "bg-white/15 text-white" : "text-navy-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              {link.label}
              {pendentes > 0 && (
                <span className="rounded-full bg-red-500 text-white text-[10px] font-bold leading-none px-1.5 py-0.5">
                  {pendentes}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

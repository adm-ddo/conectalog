import { requireCliente } from "@/lib/auth-cliente";
import { sairPortal } from "./actions";

export default async function PortalLogadoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await requireCliente();

  return (
    <div className="flex-1 flex flex-col bg-stone-50">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-navy-900">{sessao.nome}</span>
            <span className="text-xs text-stone-500">Portal do cliente</span>
          </div>
          <form action={sairPortal}>
            <button
              type="submit"
              className="text-xs text-stone-500 underline underline-offset-2"
            >
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-6 flex flex-col">{children}</main>
    </div>
  );
}

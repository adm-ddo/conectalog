import { notFound } from "next/navigation";
import { resolverClientePortal } from "@/lib/portal";

export default async function PortalTokenLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const cliente = await resolverClientePortal(token);
  if (!cliente) notFound();

  return (
    <div className="flex-1 flex flex-col bg-stone-50">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-md sm:max-w-4xl mx-auto px-4 py-1.5 flex items-baseline gap-2">
          <span className="text-sm font-semibold text-navy-900">{cliente.nome}</span>
          <span className="text-xs text-stone-500">· Portal do cliente</span>
        </div>
      </header>
      <main className="flex-1 max-w-md sm:max-w-4xl w-full mx-auto px-4 py-3 flex flex-col">
        {children}
      </main>
    </div>
  );
}

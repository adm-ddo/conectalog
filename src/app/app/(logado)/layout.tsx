import { requireMotoboy } from "@/lib/auth-motoboy";
import { prisma } from "@/lib/prisma";
import AppHeader from "./AppHeader";

export default async function AppLogadoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await requireMotoboy();
  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: sessao.empresaId },
    select: { nome: true, logoUrl: true },
  });

  return (
    <div className="flex-1 flex flex-col bg-stone-50">
      <AppHeader nome={sessao.nomeCompleto} logoUrl={empresa.logoUrl} empresaNome={empresa.nome} />
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-6 flex flex-col">{children}</main>
    </div>
  );
}

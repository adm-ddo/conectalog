import { requireTenant } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import PainelHeader from "./PainelHeader";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await requireTenant();
  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: sessao.empresaEfetivoId },
    select: { nome: true, logoUrl: true },
  });

  return (
    <div className="flex-1 flex flex-col bg-stone-50">
      <PainelHeader
        empresaNome={empresa.nome}
        usuarioNome={sessao.nome}
        vendoComoSuperAdmin={sessao.superAdmin && sessao.empresaAtivaId !== null}
        logoUrl={empresa.logoUrl}
        ehMaster={sessao.role === "MASTER" || (sessao.superAdmin && sessao.empresaAtivaId !== null)}
      />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}

import { requireEmpresa } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import PainelHeader from "./PainelHeader";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await requireEmpresa();
  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: sessao.empresaId },
    select: { nome: true },
  });

  return (
    <div className="flex-1 flex flex-col bg-stone-50">
      <PainelHeader empresaNome={empresa.nome} usuarioNome={sessao.nome} />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}

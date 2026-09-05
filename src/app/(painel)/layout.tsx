import { redirect } from "next/navigation";
import { requireTenant } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import PainelHeader from "./PainelHeader";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await requireTenant();
  const [empresa, solicitacoesPendentes] = await Promise.all([
    // findUnique (não findUniqueOrThrow) de propósito: se um superAdmin
    // apagar essa cooperativa pelo /master bem no instante em que essa
    // página carrega em outra aba, a sessão ainda pode ter o
    // empresaEfetivoId antigo por uma fração de segundo — melhor mandar
    // de volta pra /master do que estourar um erro genérico pra quem tá
    // vendo essa tela.
    prisma.empresa.findUnique({
      where: { id: sessao.empresaEfetivoId },
      select: { nome: true, logoUrl: true },
    }),
    prisma.motoboy.count({
      where: { empresaId: sessao.empresaEfetivoId, aprovadoEm: null },
    }),
  ]);
  if (!empresa) redirect("/master");

  return (
    <div className="flex-1 flex flex-col bg-stone-50">
      <PainelHeader
        empresaNome={empresa.nome}
        usuarioNome={sessao.nome}
        vendoComoSuperAdmin={sessao.superAdmin && sessao.empresaAtivaId !== null}
        logoUrl={empresa.logoUrl}
        ehMaster={sessao.role === "MASTER" || (sessao.superAdmin && sessao.empresaAtivaId !== null)}
        ehGestorCampo={sessao.role === "GESTOR_CAMPO"}
        podeAcessarFinanceiro={sessao.podeAcessarFinanceiro}
        temContaMotoboy={sessao.temContaMotoboy}
        solicitacoesPendentes={solicitacoesPendentes}
      />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}

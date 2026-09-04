import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessaoMotoboy } from "@/lib/auth-motoboy";
import { prisma } from "@/lib/prisma";
import CadastroMotoboyWizard from "./CadastroMotoboyWizard";

/** Cadastro sem link de convite — o motoboy escolhe a cooperativa e pede
 * vaga (ver solicitarVagaMotoboy em actions.ts). Diferente de
 * /app/cadastro/[token] (que já vem aprovado pelo link), aqui alguém do
 * painel da cooperativa precisa aprovar antes dele conseguir logar. */
export default async function SolicitarVagaPage() {
  const sessao = await getSessaoMotoboy();
  if (sessao) redirect("/app/inicio");

  const empresas = await prisma.empresa.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  return (
    <main className="flex-1 flex flex-col items-center gap-6 px-4 py-10 bg-stone-50">
      <div className="flex flex-col items-center gap-1">
        <span className="text-2xl font-black tracking-tight text-navy-900">
          Conecta<span className="text-brand-600">Log</span>
        </span>
        <p className="text-sm text-stone-500">
          Já tem conta?{" "}
          <Link href="/app/entrar" className="text-brand-700 underline">
            Entrar
          </Link>
        </p>
      </div>
      <CadastroMotoboyWizard origem={{ tipo: "solicitacao", empresas }} />
    </main>
  );
}

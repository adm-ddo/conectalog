import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessaoMotoboy } from "@/lib/auth-motoboy";
import { prisma } from "@/lib/prisma";
import CadastroMotoboyWizard from "../CadastroMotoboyWizard";

export default async function CadastroMotoboyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const sessao = await getSessaoMotoboy();
  if (sessao) redirect("/app/inicio");

  const { token } = await params;
  const empresa = await prisma.empresa.findUnique({
    where: { tokenCadastroMotoboy: token },
    select: { nome: true },
  });
  if (!empresa) notFound();

  return (
    <main className="flex-1 flex flex-col items-center gap-6 px-4 py-10 bg-stone-50">
      <div className="flex flex-col items-center gap-1">
        <span className="text-2xl font-black tracking-tight text-navy-900">
          Conecta<span className="text-brand-600">Log</span>
        </span>
        <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">
          {empresa.nome}
        </p>
        <p className="text-sm text-stone-500">
          Já tem conta?{" "}
          <Link href="/app/entrar" className="text-brand-700 underline">
            Entrar
          </Link>
        </p>
      </div>
      <CadastroMotoboyWizard tokenEmpresa={token} />
    </main>
  );
}

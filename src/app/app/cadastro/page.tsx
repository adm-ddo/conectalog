import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessaoMotoboy } from "@/lib/auth-motoboy";
import CadastroMotoboyWizard from "./CadastroMotoboyWizard";

export default async function CadastroMotoboyPage() {
  const sessao = await getSessaoMotoboy();
  if (sessao) redirect("/app/inicio");

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
      <CadastroMotoboyWizard />
    </main>
  );
}

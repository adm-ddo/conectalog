import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessaoMotoboy } from "@/lib/auth-motoboy";
import CadastroMotoboyWizard from "./CadastroMotoboyWizard";

/** Cadastro sem link de convite — o motoboy só se cadastra (dados, foto,
 * CNH); a escolha de cooperativa (ou ficar disponível "na prateleira" pra
 * elas chamarem) acontece depois do primeiro login, ver
 * src/app/app/(logado)/layout.tsx. */
export default async function SolicitarVagaPage() {
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
      <CadastroMotoboyWizard origem={{ tipo: "solicitacao" }} />
    </main>
  );
}

import { redirect } from "next/navigation";
import { getSessaoMotoboy } from "@/lib/auth-motoboy";
import LoginMotoboyForm from "./LoginMotoboyForm";

export default async function EntrarMotoboyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const sessao = await getSessaoMotoboy();
  if (sessao) redirect("/app/inicio");
  const { email } = await searchParams;

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-10 bg-stone-50">
      <div className="flex flex-col items-center gap-1">
        <span className="text-2xl font-black tracking-tight text-navy-900">
          Conecta<span className="text-brand-600">Log</span>
        </span>
        <p className="text-sm text-stone-500 text-center max-w-xs">
          Ainda não tem conta? Peça o link de cadastro pra cooperativa que você vai trabalhar.
        </p>
      </div>
      <LoginMotoboyForm emailInicial={email} />
    </main>
  );
}

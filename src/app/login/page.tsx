import { redirect } from "next/navigation";
import { getSessaoEmpresa } from "@/lib/auth-empresa";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const sessao = await getSessaoEmpresa();
  if (sessao) redirect("/dashboard");

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-16 bg-navy-900">
      <span className="text-3xl font-black tracking-tight text-white">
        Conecta<span className="text-brand-400">Log</span>
      </span>
      <LoginForm />
    </main>
  );
}

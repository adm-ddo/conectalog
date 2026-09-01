import Link from "next/link";
import { getSessaoEmpresa } from "@/lib/auth-empresa";
import { getSessaoMotoboy } from "@/lib/auth-motoboy";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const [sessaoEmpresa, sessaoMotoboy] = await Promise.all([
    getSessaoEmpresa(),
    getSessaoMotoboy(),
  ]);

  if (sessaoEmpresa) redirect("/dashboard");
  if (sessaoMotoboy) redirect("/app/inicio");

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-10 px-6 py-16 bg-navy-900 text-white">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-4xl font-black tracking-tight">
          Conecta<span className="text-brand-400">Log</span>
        </span>
        <p className="text-navy-200 text-sm font-semibold tracking-widest uppercase">
          Gestão · Motoboys · Operações · Logística
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/app/entrar"
          className="rounded-xl bg-brand-500 hover:bg-brand-600 text-navy-900 font-bold text-lg px-8 py-4 text-center transition-colors"
        >
          🏍️ Sou motoboy
        </Link>
        <Link
          href="/login"
          className="rounded-xl border border-white/30 hover:bg-white/10 text-white font-bold text-lg px-8 py-4 text-center transition-colors"
        >
          🏢 Sou a cooperativa
        </Link>
      </div>
    </main>
  );
}

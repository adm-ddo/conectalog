import Link from "next/link";

export default function VerifiqueSeuEmailCooperativaPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-16 bg-stone-50 text-center">
      <span className="text-4xl">📬</span>
      <div className="flex flex-col gap-2 max-w-sm">
        <h1 className="text-lg font-semibold text-navy-900">Confira seu e-mail</h1>
        <p className="text-sm text-stone-600">
          Mandamos um link de confirmação pro e-mail que você cadastrou. Clique nele pra ativar
          sua cooperativa e entrar no painel.
        </p>
      </div>
      <Link href="/login" className="text-sm text-brand-700 underline">
        Voltar pro login
      </Link>
    </main>
  );
}

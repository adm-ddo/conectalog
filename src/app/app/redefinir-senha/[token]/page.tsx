import Link from "next/link";
import { buscarTokenMotoboyValido } from "@/lib/auth-motoboy";
import RedefinirSenhaMotoboyForm from "./RedefinirSenhaMotoboyForm";

const MOTIVO_LABEL: Record<string, string> = {
  expirado: "Esse link de recuperação expirou.",
  usado: "Esse link já foi usado.",
  invalido: "Esse link não é válido.",
};

export default async function RedefinirSenhaMotoboyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resultado = await buscarTokenMotoboyValido(token, "RECUPERACAO_SENHA");

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-10 bg-stone-50">
      <span className="text-2xl font-black tracking-tight text-navy-900">
        Conecta<span className="text-brand-600">Log</span>
      </span>
      {resultado.valido ? (
        <RedefinirSenhaMotoboyForm token={token} />
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm w-full max-w-sm">
          <h1 className="text-xl font-semibold text-navy-900">Link inválido</h1>
          <p className="text-sm text-stone-600">
            {MOTIVO_LABEL[resultado.motivo]} Peça um novo em &quot;Esqueci minha senha&quot;.
          </p>
          <Link href="/app/recuperar-senha" className="text-brand-700 underline text-sm">
            Pedir novo link
          </Link>
        </div>
      )}
    </main>
  );
}

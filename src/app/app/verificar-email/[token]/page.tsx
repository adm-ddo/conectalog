import Link from "next/link";
import { buscarTokenMotoboyValido } from "@/lib/auth-motoboy";
import ConfirmarEmailButton from "./ConfirmarEmailButton";

const MOTIVO_LABEL: Record<string, string> = {
  expirado: "Esse link de confirmação expirou.",
  usado: "Esse link já foi usado.",
  invalido: "Esse link não é válido.",
};

export default async function VerificarEmailMotoboyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resultado = await buscarTokenMotoboyValido(token, "VERIFICACAO_EMAIL");

  return (
    <main className="flex-1 flex items-center justify-center py-8 px-4 bg-stone-50">
      <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm w-full max-w-sm">
        {!resultado.valido ? (
          <>
            <h1 className="text-xl font-semibold text-navy-900">Link inválido</h1>
            <p className="text-sm text-stone-600">
              {MOTIVO_LABEL[resultado.motivo]} Peça um novo na tela de login.
            </p>
            <Link href="/app/entrar" className="text-brand-700 underline text-sm">
              Voltar pro login
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-navy-900">Confirmar seu e-mail</h1>
            <p className="text-sm text-stone-600">Clique no botão abaixo pra ativar sua conta.</p>
            <ConfirmarEmailButton token={token} />
          </>
        )}
      </div>
    </main>
  );
}

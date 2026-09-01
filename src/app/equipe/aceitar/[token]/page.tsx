import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AceitarConviteForm from "./AceitarConviteForm";

export default async function AceitarConvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const convite = await prisma.conviteEquipe.findUnique({
    where: { token },
    include: { empresa: { select: { nome: true } } },
  });

  const invalido = !convite || convite.aceitoEm !== null || convite.expiraEm < new Date();

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-16 bg-navy-900">
      <span className="text-3xl font-black tracking-tight text-white">
        Conecta<span className="text-brand-400">Log</span>
      </span>

      {invalido || !convite ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm w-full max-w-sm text-center">
          <h1 className="text-xl font-semibold text-navy-900">Convite inválido</h1>
          <p className="text-sm text-stone-600">
            Esse convite não existe mais, já foi usado ou expirou. Peça um novo pra cooperativa.
          </p>
          <Link href="/login" className="text-brand-700 underline text-sm">
            Ir pro login
          </Link>
        </div>
      ) : (
        <AceitarConviteForm token={token} email={convite.email} nomeEmpresa={convite.empresa.nome} />
      )}
    </main>
  );
}

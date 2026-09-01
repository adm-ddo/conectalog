import { notFound } from "next/navigation";
import { resolverClientePortal } from "@/lib/portal";
import { prisma } from "@/lib/prisma";
import SolicitarApoioForm from "./SolicitarApoioForm";

const LABEL_STATUS = {
  PENDENTE: "Aguardando resposta",
  A_CAMINHO: "Apoio a caminho",
  SEM_MOTO: "Sem moto no momento",
} as const;

export default async function ApoioPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const cliente = await resolverClientePortal(token);
  if (!cliente) notFound();

  const solicitacoes = await prisma.solicitacaoApoio.findMany({
    where: { clienteId: cliente.id },
    orderBy: { criadoEm: "desc" },
    take: 10,
  });

  const temPendente = solicitacoes.some((s) => s.status === "PENDENTE");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-navy-900">Pedir apoio</h1>

      {temPendente ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          Já tem um pedido de apoio aguardando resposta da cooperativa.
        </div>
      ) : (
        <SolicitarApoioForm token={token} />
      )}

      {solicitacoes.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-navy-900">Histórico</h2>
          <ul className="flex flex-col gap-2">
            {solicitacoes.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm"
              >
                <span>
                  {s.quantidade} moto{s.quantidade > 1 ? "s" : ""} —{" "}
                  {s.criadoEm.toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    s.status === "A_CAMINHO"
                      ? "bg-brand-100 text-brand-800"
                      : s.status === "SEM_MOTO"
                        ? "bg-stone-100 text-stone-600"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {LABEL_STATUS[s.status]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

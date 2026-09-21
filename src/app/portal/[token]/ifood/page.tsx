import { notFound } from "next/navigation";
import { resolverClientePortal } from "@/lib/portal";
import { prisma } from "@/lib/prisma";
import { formatarMoeda } from "@/lib/valores";
import ChamadoIfoodForm from "./ChamadoIfoodForm";
import BotaoVoltar from "@/components/BotaoVoltar";

export default async function IfoodPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const cliente = await resolverClientePortal(token);
  if (!cliente) notFound();

  const chamados = await prisma.chamadoIfood.findMany({
    where: { clienteId: cliente.id },
    orderBy: { criadoEm: "desc" },
    take: 10,
  });

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
      <div>
        <BotaoVoltar />
        <h1 className="text-lg font-semibold text-navy-900 mt-1">Chamado iFood</h1>
      </div>

      <ChamadoIfoodForm token={token} />

      {chamados.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-navy-900">Histórico</h2>
          <ul className="flex flex-col gap-2">
            {chamados.map((c) => (
              <li
                key={c.id}
                className="flex flex-col gap-0.5 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-stone-500">
                    {c.criadoEm.toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "America/Sao_Paulo",
                    })}
                  </span>
                  <span className="font-medium text-navy-900">R$ {formatarMoeda(c.valorIfood)}</span>
                </div>
                <span className="text-xs text-stone-500">
                  Saipos {c.numeroPedidoSaipos} · iFood {c.numeroPedidoIfood}
                </span>
                <span className="text-xs text-brand-700 font-medium">
                  Desconto na fatura: R$ {formatarMoeda(c.valorDesconto)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

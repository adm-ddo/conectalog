import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant, clientesResponsaveisIds } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { dataISOBrasil } from "@/lib/data";
import { LABEL_TURNO } from "@/lib/equipe";
import EquipamentoBadge from "@/components/EquipamentoBadge";
import BotaoVoltar from "@/components/BotaoVoltar";
import type { Prisma } from "@/generated/prisma/client";
import type { StatusConfirmacaoEscala } from "@/generated/prisma/enums";

const TITULO: Record<StatusConfirmacaoEscala, string> = {
  CONFIRMADO: "Já confirmaram",
  PENDENTE: "Ainda não responderam",
  RECUSADO: "Recusaram",
};

const STATUS_VALIDOS = new Set(["CONFIRMADO", "PENDENTE", "RECUSADO"]);

export default async function ConfirmacoesEscalaPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sessao = await requireTenant();
  const { status } = await searchParams;
  if (!status || !STATUS_VALIDOS.has(status)) notFound();
  const statusConfirmacao = status as StatusConfirmacaoEscala;

  const idsResponsaveis = await clientesResponsaveisIds(sessao);
  const escopoGestor = sessao.role === "GESTOR_CAMPO";
  const filtroCliente: Prisma.ClienteWhereInput = escopoGestor
    ? { id: { in: idsResponsaveis } }
    : {};

  const escalas = await prisma.escalaTurno.findMany({
    where: {
      data: new Date(dataISOBrasil()),
      statusConfirmacao,
      cliente: { empresaId: sessao.empresaEfetivoId, ...filtroCliente },
    },
    include: {
      motoboy: { select: { id: true, nomeCompleto: true, tipoEquipamento: true } },
      cliente: { select: { id: true, nome: true } },
    },
    orderBy: [{ cliente: { nome: "asc" } }, { criadoEm: "asc" }],
  });

  const porCliente = new Map<
    number,
    { nome: string; itens: typeof escalas }
  >();
  for (const e of escalas) {
    const atual = porCliente.get(e.cliente.id) ?? { nome: e.cliente.nome, itens: [] };
    atual.itens.push(e);
    porCliente.set(e.cliente.id, atual);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <BotaoVoltar />
        <h1 className="text-2xl font-semibold text-navy-900 mt-1">
          {TITULO[statusConfirmacao]} ({escalas.length})
        </h1>
        <p className="text-stone-600 mt-1 text-sm">Escalas de hoje, agrupadas por cliente.</p>
      </div>

      {porCliente.size === 0 ? (
        <p className="text-sm text-stone-500">Nenhuma escala nessa situação hoje.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {[...porCliente.values()].map((grupo) => (
            <div key={grupo.nome} className="rounded-2xl border border-stone-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-navy-900 mb-3">
                {grupo.nome} · {grupo.itens.length}
              </h2>
              <ul className="flex flex-col gap-2">
                {grupo.itens.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 min-w-0">
                      {escopoGestor ? (
                        <span className="text-navy-900 truncate">{e.motoboy.nomeCompleto}</span>
                      ) : (
                        <Link
                          href={`/motoboys/${e.motoboy.id}`}
                          className="text-navy-900 hover:underline truncate"
                        >
                          {e.motoboy.nomeCompleto}
                        </Link>
                      )}
                      <EquipamentoBadge tipo={e.motoboy.tipoEquipamento} />
                    </span>
                    <span className="shrink-0 text-xs text-stone-500 capitalize">
                      {LABEL_TURNO[e.turno]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

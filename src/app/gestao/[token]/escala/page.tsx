import Link from "next/link";
import { notFound } from "next/navigation";
import { resolverClienteGestao } from "@/lib/portalGestao";
import { prisma } from "@/lib/prisma";
import { dataISOBrasil, formatarData } from "@/lib/data";
import { LABEL_TURNO } from "@/lib/equipe";
import EquipamentoBadge from "@/components/EquipamentoBadge";
import type { StatusConfirmacaoEscala } from "@/generated/prisma/enums";

const LABEL_CONFIRMACAO: Record<StatusConfirmacaoEscala, { texto: string; classe: string }> = {
  CONFIRMADO: { texto: "Confirmou", classe: "bg-brand-100 text-brand-800" },
  RECUSADO: { texto: "Não vai poder", classe: "bg-red-100 text-red-700" },
  PENDENTE: { texto: "Aguardando resposta", classe: "bg-stone-100 text-stone-500" },
  EXPIRADA: { texto: "Não confirmou a tempo", classe: "bg-amber-100 text-amber-800" },
};

/** Escala do cliente por período — quem está previsto pra trabalhar e se
 * já confirmou, complementando o relatório (que é sobre quem de fato já
 * trabalhou). Mesmo espírito de transparência do painel de gestão. */
export default async function GestaoEscalaPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ inicio?: string; fim?: string }>;
}) {
  const { token } = await params;
  const cliente = await resolverClienteGestao(token);
  if (!cliente) notFound();

  const agora = new Date();
  const hoje = dataISOBrasil(agora);
  const seisDiasDepois = dataISOBrasil(new Date(agora.getTime() + 6 * 24 * 60 * 60 * 1000));
  const query = await searchParams;
  const dataInicio = query.inicio || hoje;
  const dataFim = query.fim || seisDiasDepois;

  const escalas = await prisma.escalaTurno.findMany({
    where: { clienteId: cliente.id, data: { gte: new Date(dataInicio), lte: new Date(dataFim) } },
    orderBy: [{ data: "asc" }, { turno: "asc" }],
    select: {
      id: true,
      data: true,
      turno: true,
      statusConfirmacao: true,
      motoboy: { select: { nomeCompleto: true, tipoEquipamento: true } },
    },
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href={`/gestao/${token}`} className="text-xs text-stone-500 hover:underline">
          ← Relatório
        </Link>
        <h1 className="text-lg font-semibold text-navy-900 mt-1">Escala</h1>
        <p className="text-sm text-stone-500 mt-1">Quem está previsto pra trabalhar e se já confirmou.</p>
      </div>

      <form method="get" className="rounded-2xl border border-stone-200 bg-white p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">De</label>
          <input
            type="date"
            name="inicio"
            defaultValue={dataInicio}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">Até</label>
          <input
            type="date"
            name="fim"
            defaultValue={dataFim}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2.5 transition-colors"
        >
          Ver período
        </button>
      </form>

      {escalas.length === 0 ? (
        <p className="text-sm text-stone-500">Nenhuma escala nesse período.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {escalas.map((e) => (
            <li key={e.id} className="rounded-xl border border-stone-200 bg-white px-4 py-3 flex items-center justify-between gap-2">
              <div className="min-w-0 flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-navy-900 flex items-center gap-1.5 min-w-0 truncate">
                  {e.motoboy.nomeCompleto}
                  <EquipamentoBadge tipo={e.motoboy.tipoEquipamento} />
                </span>
                <span className="text-xs text-stone-500">
                  {formatarData(e.data)} · {LABEL_TURNO[e.turno as keyof typeof LABEL_TURNO]}
                </span>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${LABEL_CONFIRMACAO[e.statusConfirmacao].classe}`}>
                {LABEL_CONFIRMACAO[e.statusConfirmacao].texto}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

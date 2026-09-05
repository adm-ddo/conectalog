import Link from "next/link";
import { requireTenant, clientesResponsaveisIds } from "@/lib/auth-empresa";
import { rankingMotoboys, formatarHoras, type PeriodoRanking } from "@/lib/ranking";
import BotaoVoltar from "@/components/BotaoVoltar";
import EquipamentoBadge from "@/components/EquipamentoBadge";
import type { Prisma } from "@/generated/prisma/client";

const TITULO_PERIODO: Record<PeriodoRanking, string> = {
  hoje: "Hoje",
  semana: "Esta semana",
};

const CLASSE_POSICAO = [
  "bg-amber-100 text-amber-800",
  "bg-stone-200 text-stone-700",
  "bg-orange-100 text-orange-800",
];

export default async function RankingMotoboysPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const sessao = await requireTenant();
  const { periodo: periodoParam } = await searchParams;
  const periodo: PeriodoRanking = periodoParam === "semana" ? "semana" : "hoje";

  const idsResponsaveis = await clientesResponsaveisIds(sessao);
  const escopoGestor = sessao.role === "GESTOR_CAMPO";
  const filtroCliente: Prisma.ClienteWhereInput = escopoGestor ? { id: { in: idsResponsaveis } } : {};

  const ranking = await rankingMotoboys(sessao.empresaEfetivoId, periodo, filtroCliente);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <BotaoVoltar />
        <h1 className="text-2xl font-semibold text-navy-900 mt-1">Ranking de motoboys</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Ordenado por quantidade de bandas — soma turnos normais e apoios em outros clientes.
        </p>
      </div>

      <div className="flex gap-2">
        {(["hoje", "semana"] as const).map((p) => (
          <Link
            key={p}
            href={`/dashboard/ranking?periodo=${p}`}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              periodo === p
                ? "bg-navy-900 text-white"
                : "bg-white border border-stone-300 text-stone-600 hover:border-brand-300"
            }`}
          >
            {TITULO_PERIODO[p]}
          </Link>
        ))}
      </div>

      {ranking.length === 0 ? (
        <p className="text-sm text-stone-500">Ninguém trabalhou nesse período ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {ranking.map((linha, i) => (
            <li
              key={linha.motoboyId}
              className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    CLASSE_POSICAO[i] ?? "bg-stone-100 text-stone-500"
                  }`}
                >
                  {i + 1}
                </span>
                <Link
                  href={`/motoboys/${linha.motoboyId}`}
                  className="text-sm font-medium text-navy-900 hover:underline truncate"
                >
                  {linha.nome}
                </Link>
                <EquipamentoBadge tipo={linha.tipoEquipamento} />
              </div>
              <div className="flex items-center gap-4 shrink-0 text-right">
                <div>
                  <p className="text-lg font-bold text-navy-900 leading-tight">{linha.totalBandas}</p>
                  <p className="text-[10px] text-stone-500 leading-tight">bandas</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-600 leading-tight">
                    {formatarHoras(linha.horasTrabalhadas)}
                  </p>
                  <p className="text-[10px] text-stone-500 leading-tight">no turno</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

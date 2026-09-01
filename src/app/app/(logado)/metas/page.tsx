import { requireMotoboy } from "@/lib/auth-motoboy";
import { prisma } from "@/lib/prisma";
import { formatarMoeda, paraNumero } from "@/lib/valores";
import { formatarData } from "@/lib/data";
import { mensagemMotivacional } from "@/lib/motivacao";
import MetaForm from "./MetaForm";
import EncerrarMetaButton from "./EncerrarMetaButton";

export default async function MetasMotoboyPage() {
  const sessao = await requireMotoboy();

  const meta = await prisma.meta.findFirst({
    where: { motoboyId: sessao.motoboyId, ativa: true },
    orderBy: { criadoEm: "desc" },
  });

  let progresso = 0;
  let atual = 0;
  if (meta) {
    const turnos = await prisma.turno.findMany({
      where: {
        motoboyId: sessao.motoboyId,
        status: { in: ["CONCLUIDO", "PAGO"] },
        horaInicio: { gte: meta.periodoInicio, lte: meta.periodoFim },
      },
      select: {
        quantidadeBandas: true,
        valorTotal: true,
        apoios: { select: { quantidadeBandas: true, valorTotal: true } },
      },
    });
    for (const t of turnos) {
      if (meta.tipo === "BANDAS") {
        atual += t.quantidadeBandas;
        for (const a of t.apoios) atual += a.quantidadeBandas;
      } else {
        atual += Number(t.valorTotal ?? 0);
        for (const a of t.apoios) atual += Number(a.valorTotal);
      }
    }
    progresso = paraNumero(meta.valorAlvo) > 0 ? atual / paraNumero(meta.valorAlvo) : 0;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-navy-900">Minhas metas</h1>
        <p className="text-sm text-stone-500 mt-1">
          Metas que você mesmo definiu pra você — quantas bandas quer fazer ou quanto quer
          faturar.
        </p>
      </div>

      {meta && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-700 uppercase tracking-wide">
              Meta ativa
            </span>
            <EncerrarMetaButton metaId={meta.id} />
          </div>
          <p className="text-sm text-stone-700">
            {meta.tipo === "BANDAS"
              ? `${Math.round(atual)} de ${paraNumero(meta.valorAlvo)} bandas`
              : `R$ ${formatarMoeda(atual)} de R$ ${formatarMoeda(meta.valorAlvo)}`}
          </p>
          <div className="h-2.5 w-full rounded-full bg-white overflow-hidden">
            <div
              className="h-full bg-brand-500 transition-all"
              style={{ width: `${Math.min(100, progresso * 100)}%` }}
            />
          </div>
          <p className="text-sm font-medium text-navy-900">{mensagemMotivacional(progresso)}</p>
          <p className="text-xs text-stone-500">Até {formatarData(meta.periodoFim)}</p>
        </div>
      )}

      <MetaForm />
    </div>
  );
}

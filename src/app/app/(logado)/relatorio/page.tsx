import Link from "next/link";
import { requireMotoboy } from "@/lib/auth-motoboy";
import { prisma } from "@/lib/prisma";
import { formatarMoeda } from "@/lib/valores";
import { dataISOBrasil, instanteBrasil, formatarData } from "@/lib/data";

const PERIODOS = {
  "7": { label: "7 dias" },
  "15": { label: "15 dias" },
  "30": { label: "30 dias" },
  mes: { label: "Mês fechado" },
} as const;

type ChavePeriodo = keyof typeof PERIODOS;

function periodoValido(valor: string | undefined): valor is ChavePeriodo {
  return !!valor && valor in PERIODOS;
}

/** "Mês fechado" é o mês calendário anterior inteiro (1º ao último dia) —
 * diferente dos outros, que são uma janela rolante de N dias até hoje.
 * Tudo calculado no calendário de Brasília, nunca no fuso do servidor. */
function calcularJanela(periodo: ChavePeriodo): { desde: Date; ate: Date } {
  const agora = new Date();
  if (periodo === "mes") {
    const [ano, mes] = dataISOBrasil(agora).split("-").map(Number);
    const inicioMesAtual = instanteBrasil(`${ano}-${String(mes).padStart(2, "0")}-01`);
    const anoAnterior = mes === 1 ? ano - 1 : ano;
    const mesAnterior = mes === 1 ? 12 : mes - 1;
    const desde = instanteBrasil(`${anoAnterior}-${String(mesAnterior).padStart(2, "0")}-01`);
    const ate = new Date(inicioMesAtual.getTime() - 1);
    return { desde, ate };
  }
  const dias = { "7": 7, "15": 15, "30": 30 }[periodo];
  const desde = instanteBrasil(dataISOBrasil(agora), -dias * 24 * 60);
  return { desde, ate: agora };
}

export default async function RelatorioMotoboyPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const sessao = await requireMotoboy();
  const { periodo: periodoParam } = await searchParams;
  const periodo: ChavePeriodo = periodoValido(periodoParam) ? periodoParam : "7";

  const { desde, ate } = calcularJanela(periodo);

  const [turnos, vales, descontosAssiduidade] = await Promise.all([
    prisma.turno.findMany({
      where: {
        motoboyId: sessao.motoboyId,
        status: { in: ["CONCLUIDO", "PAGO"] },
        horaInicio: { gte: desde, lte: ate },
      },
      orderBy: { horaInicio: "desc" },
      include: {
        cliente: { select: { nome: true } },
        apoios: { select: { quantidadeBandas: true, valorTotal: true, cliente: { select: { nome: true } } } },
      },
    }),
    prisma.vale.findMany({
      where: { motoboyId: sessao.motoboyId, data: { gte: desde, lte: ate } },
      orderBy: { data: "desc" },
    }),
    prisma.descontoAssiduidade.findMany({
      where: { motoboyId: sessao.motoboyId, criadoEm: { gte: desde, lte: ate } },
      orderBy: { criadoEm: "desc" },
      include: { turno: { select: { cliente: { select: { nome: true } } } } },
    }),
  ]);

  let totalBandas = 0;
  let totalValor = 0;
  for (const t of turnos) {
    totalBandas += t.quantidadeBandas;
    totalValor += Number(t.valorTotal ?? 0);
    for (const a of t.apoios) {
      totalBandas += a.quantidadeBandas;
      totalValor += Number(a.valorTotal);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-lg font-semibold text-navy-900">Relatório</h1>

      <div className="flex gap-2">
        {(Object.keys(PERIODOS) as ChavePeriodo[]).map((chave) => (
          <Link
            key={chave}
            href={`/app/relatorio?periodo=${chave}`}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium text-center ${
              periodo === chave ? "bg-brand-600 text-white" : "bg-stone-100 text-stone-600"
            }`}
          >
            {PERIODOS[chave].label}
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-2">
        <div className="flex justify-between text-sm">
          <span className="text-stone-500">Total de bandas</span>
          <span className="font-semibold text-navy-900">{totalBandas}</span>
        </div>
        <div className="flex justify-between text-base">
          <span className="font-semibold text-navy-900">Total a receber</span>
          <span className="font-bold text-brand-700">R$ {formatarMoeda(totalValor)}</span>
        </div>
      </div>

      {vales.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-navy-900">Vales</h2>
          <ul className="flex flex-col gap-2">
            {vales.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex flex-col">
                  <span className="text-navy-900">
                    R$ {formatarMoeda(v.valor)} — {formatarData(v.data)}
                  </span>
                  {v.observacao && <span className="text-xs text-stone-500">{v.observacao}</span>}
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    v.descontadoEm
                      ? "bg-stone-100 text-stone-600"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {v.descontadoEm ? "Já descontado" : "Ainda não descontado"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {descontosAssiduidade.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-white p-5 flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-amber-700">Descontos por atraso</h2>
          <ul className="flex flex-col gap-2">
            {descontosAssiduidade.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-navy-900">
                  {d.turno.cliente.nome} — {formatarData(d.criadoEm)} · {d.minutosAtraso} min de
                  atraso
                </span>
                <span className="shrink-0 text-amber-700 font-semibold">
                  -R$ {formatarMoeda(d.valorDesconto)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {turnos.length === 0 ? (
        <p className="text-sm text-stone-500">Nenhum turno concluído nesse período.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {turnos.map((t) => (
            <li key={t.id} className="rounded-xl border border-stone-200 bg-white px-4 py-3">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-navy-900">{t.cliente.nome}</span>
                <span className="text-stone-500">{formatarData(t.horaInicio)}</span>
              </div>
              <div className="text-xs text-stone-500 mt-1">
                {t.quantidadeBandas} bandas
                {t.quantidadeTaxasExtras > 0 && ` · ${t.quantidadeTaxasExtras} taxas extras`}
                {" · R$ "}
                {formatarMoeda(t.valorTotal)}
              </div>
              {t.fechamentoAutomatico && t.resolvidoDivergenciaEm === null && (
                <p className="text-xs text-amber-700 mt-1">
                  Você esqueceu de encerrar esse turno — a cooperativa ainda vai confirmar quantas
                  entregas você fez pra esse valor ficar certo.
                </p>
              )}
              {t.apoios.map((a, i) => (
                <div key={i} className="text-xs text-stone-400 mt-0.5">
                  ↳ apoio em {a.cliente.nome}: {a.quantidadeBandas} bandas
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

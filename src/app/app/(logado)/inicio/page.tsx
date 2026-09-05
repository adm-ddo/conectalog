import Link from "next/link";
import { requireMotoboy } from "@/lib/auth-motoboy";
import { prisma } from "@/lib/prisma";
import { formatarHora } from "@/lib/data";
import { paraNumero } from "@/lib/valores";
import EstrelasMedia from "@/components/EstrelasMedia";
import NotificacoesBanner from "./NotificacoesBanner";
import SairCooperativaButton from "./SairCooperativaButton";
import AutoRefresh from "@/components/AutoRefresh";

export default async function InicioMotoboyPage() {
  const sessao = await requireMotoboy();

  const [turnoAberto, avaliacao, notificacoes] = await Promise.all([
    prisma.turno.findFirst({
      where: { motoboyId: sessao.motoboyId, status: "ABERTO" },
      include: {
        cliente: { select: { nome: true } },
        apoios: { select: { id: true, quantidadeBandas: true, cliente: { select: { nome: true } } } },
      },
    }),
    prisma.avaliacao.aggregate({
      where: { motoboyId: sessao.motoboyId },
      _avg: { nota: true },
      _count: { _all: true },
    }),
    prisma.notificacao.findMany({
      where: { motoboyId: sessao.motoboyId, lida: false },
      orderBy: { criadoEm: "desc" },
      select: { id: true, mensagem: true, escalaId: true },
    }),
  ]);

  const minhaNota = (
    <EstrelasMedia media={paraNumero(avaliacao._avg.nota)} total={avaliacao._count._all} />
  );
  const avisos = <NotificacoesBanner notificacoes={notificacoes} />;

  if (turnoAberto) {
    const totalBandasApoios = turnoAberto.apoios.reduce((s, a) => s + a.quantidadeBandas, 0);
    return (
      <div className="flex flex-col gap-5">
        <AutoRefresh />
        {avisos}
        {minhaNota}

        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 flex flex-col gap-1">
          <span className="text-xs font-semibold text-brand-700 uppercase tracking-wide">
            Turno em andamento
          </span>
          <span className="text-lg font-semibold text-navy-900">{turnoAberto.cliente.nome}</span>
          <span className="text-sm text-stone-600">
            Desde {formatarHora(turnoAberto.horaInicio)}
          </span>
        </div>

        {turnoAberto.apoios.length > 0 && (
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <p className="text-xs text-stone-500 mb-2">
              Apoios hoje ({turnoAberto.apoios.length} · {totalBandasApoios} bandas)
            </p>
            <ul className="flex flex-col gap-1">
              {turnoAberto.apoios.map((a) => (
                <li key={a.id} className="text-sm text-stone-700">
                  {a.cliente.nome} — {a.quantidadeBandas} bandas
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link
            href="/app/turno/apoio"
            className="rounded-xl border border-brand-300 text-brand-700 font-semibold text-center py-3.5 hover:bg-brand-50 transition-colors"
          >
            🤝 Registrar apoio em outro cliente
          </Link>
          <Link
            href="/app/turno/encerrar"
            className="rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-semibold text-center py-3.5 transition-colors"
          >
            Encerrar turno
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <AutoRefresh />
      {avisos}
      {minhaNota}

      <p className="text-sm text-stone-600">
        Você não está em turno agora. Escolha onde vai trabalhar pra começar.
      </p>
      <Link
        href="/app/turno/iniciar"
        className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-center py-4 text-lg transition-colors"
      >
        Iniciar turno
      </Link>
      <SairCooperativaButton />
    </div>
  );
}

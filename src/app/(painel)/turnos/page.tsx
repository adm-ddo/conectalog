import Link from "next/link";
import { requireTenantCompleto } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { formatarDataHora } from "@/lib/data";
import { formatarMoeda } from "@/lib/valores";
import { LABEL_TURNO } from "@/lib/equipe";
import EquipamentoBadge from "@/components/EquipamentoBadge";

const LIMITE = 100;

const LABEL_STATUS: Record<string, string> = {
  ABERTO: "Aberto",
  CONCLUIDO: "Concluído",
  PAGO: "Pago",
};

const COR_STATUS: Record<string, string> = {
  ABERTO: "bg-amber-100 text-amber-800",
  CONCLUIDO: "bg-stone-100 text-stone-700",
  PAGO: "bg-brand-100 text-brand-800",
};

export default async function TurnosPage({
  searchParams,
}: {
  searchParams: Promise<{ motoboyId?: string; clienteId?: string; status?: string }>;
}) {
  const sessao = await requireTenantCompleto();
  const params = await searchParams;

  const motoboyId = Number(params.motoboyId) || undefined;
  const clienteId = Number(params.clienteId) || undefined;
  const status = params.status && params.status !== "TODOS" ? params.status : undefined;

  const [motoboys, clientes, turnos] = await Promise.all([
    prisma.motoboy.findMany({
      where: { empresaId: sessao.empresaEfetivoId },
      orderBy: { nomeCompleto: "asc" },
      select: { id: true, nomeCompleto: true },
    }),
    prisma.cliente.findMany({
      where: { empresaId: sessao.empresaEfetivoId },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.turno.findMany({
      where: {
        motoboy: { empresaId: sessao.empresaEfetivoId },
        ...(motoboyId ? { motoboyId } : {}),
        ...(clienteId ? { clienteId } : {}),
        ...(status ? { status: status as "ABERTO" | "CONCLUIDO" | "PAGO" } : {}),
      },
      orderBy: { horaInicio: "desc" },
      take: LIMITE,
      select: {
        id: true,
        horaInicio: true,
        horaFim: true,
        turnoPredefinido: true,
        status: true,
        quantidadeBandas: true,
        valorTotal: true,
        motoboy: { select: { nomeCompleto: true, tipoEquipamento: true } },
        cliente: { select: { nome: true } },
      },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Turnos</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Histórico de turnos com foto e assinatura de início/fim de cada um.
        </p>
      </div>

      <form method="get" className="rounded-2xl border border-stone-200 bg-white p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">Motoboy</label>
          <select
            name="motoboyId"
            defaultValue={motoboyId ?? ""}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm min-w-[180px]"
          >
            <option value="">Todos</option>
            {motoboys.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nomeCompleto}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">Cliente</label>
          <select
            name="clienteId"
            defaultValue={clienteId ?? ""}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm min-w-[180px]"
          >
            <option value="">Todos</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">Status</label>
          <select
            name="status"
            defaultValue={status ?? "TODOS"}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm min-w-[140px]"
          >
            <option value="TODOS">Todos</option>
            <option value="ABERTO">Aberto</option>
            <option value="CONCLUIDO">Concluído</option>
            <option value="PAGO">Pago</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2.5 transition-colors"
        >
          Filtrar
        </button>
      </form>

      {turnos.length === 0 ? (
        <p className="text-stone-500 text-sm">Nenhum turno encontrado com esse filtro.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {turnos.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/turnos/${t.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 hover:border-brand-300 transition-colors"
                >
                  <div className="min-w-0 flex flex-col gap-1">
                    <span className="text-sm font-semibold text-navy-900 flex items-center gap-2">
                      {t.motoboy.nomeCompleto}
                      <EquipamentoBadge tipo={t.motoboy.tipoEquipamento} />
                    </span>
                    <span className="text-xs text-stone-500">
                      {t.cliente.nome} · {LABEL_TURNO[t.turnoPredefinido as keyof typeof LABEL_TURNO] ?? "livre"} ·{" "}
                      {formatarDataHora(t.horaInicio)}
                      {t.horaFim && ` até ${formatarDataHora(t.horaFim)}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-stone-500">{t.quantidadeBandas} bandas</span>
                    <span className="text-sm font-semibold text-navy-900">
                      {t.valorTotal ? `R$ ${formatarMoeda(t.valorTotal)}` : "—"}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${COR_STATUS[t.status]}`}
                    >
                      {LABEL_STATUS[t.status]}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {turnos.length === LIMITE && (
            <p className="text-xs text-stone-400">
              Mostrando os {LIMITE} turnos mais recentes — filtre por motoboy ou cliente pra ver mais.
            </p>
          )}
        </>
      )}
    </div>
  );
}

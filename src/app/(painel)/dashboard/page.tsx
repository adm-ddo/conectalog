import Link from "next/link";
import { requireEmpresa } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { turnoAtivoAgora, motosContratadasNoTurno } from "@/lib/equipe";
import DashboardAutoRefresh from "../DashboardAutoRefresh";
import EquipamentoBadge from "@/components/EquipamentoBadge";
import SolicitacaoApoioAlert from "./SolicitacaoApoioAlert";
import DivergenciaRow from "./DivergenciaRow";
import type { TipoEquipamento } from "@/generated/prisma/enums";

export default async function DashboardPage() {
  const sessao = await requireEmpresa();

  const [turnosAbertos, totalMotoboysAtivos, clientesAtivos, solicitacoesApoio, turnosDivergentes] =
    await Promise.all([
      prisma.turno.findMany({
        where: { status: "ABERTO", motoboy: { empresaId: sessao.empresaId } },
        orderBy: { horaInicio: "asc" },
        select: {
          id: true,
          horaInicio: true,
          motoboy: { select: { nomeCompleto: true, tipoEquipamento: true } },
          cliente: { select: { id: true, nome: true } },
        },
      }),
      prisma.motoboy.count({ where: { empresaId: sessao.empresaId, ativo: true } }),
      prisma.cliente.findMany({ where: { empresaId: sessao.empresaId, ativo: true } }),
      prisma.solicitacaoApoio.findMany({
        where: { status: "PENDENTE", cliente: { empresaId: sessao.empresaId } },
        orderBy: { criadoEm: "asc" },
        include: { cliente: { select: { nome: true } } },
      }),
      prisma.turno.findMany({
        where: {
          motoboy: { empresaId: sessao.empresaId },
          resolvidoDivergenciaEm: null,
          quantidadeBandasCliente: { not: null },
        },
        include: { motoboy: { select: { nomeCompleto: true } }, cliente: { select: { nome: true } } },
      }),
    ]);

  const divergencias = turnosDivergentes.filter(
    (t) =>
      t.quantidadeBandasCliente !== t.quantidadeBandas ||
      t.quantidadeTaxasExtrasCliente !== t.quantidadeTaxasExtras
  );

  const porCliente = new Map<
    number,
    {
      nome: string;
      motoboys: {
        id: number;
        nome: string;
        horaInicio: Date;
        tipoEquipamento: TipoEquipamento | null;
      }[];
    }
  >();
  for (const t of turnosAbertos) {
    const atual = porCliente.get(t.cliente.id) ?? { nome: t.cliente.nome, motoboys: [] };
    atual.motoboys.push({
      id: t.id,
      nome: t.motoboy.nomeCompleto,
      horaInicio: t.horaInicio,
      tipoEquipamento: t.motoboy.tipoEquipamento,
    });
    porCliente.set(t.cliente.id, atual);
  }

  const equipesIncompletas = clientesAtivos
    .map((cliente) => {
      const turnoAtual = turnoAtivoAgora(cliente);
      const contratadas = motosContratadasNoTurno(cliente, turnoAtual);
      const presentes = porCliente.get(cliente.id)?.motoboys.length ?? 0;
      return { id: cliente.id, nome: cliente.nome, turnoAtual, contratadas, presentes };
    })
    .filter((c) => c.turnoAtual !== null && c.contratadas > 0 && c.presentes < c.contratadas);

  return (
    <div className="flex flex-col gap-6">
      <DashboardAutoRefresh />
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Dashboard</h1>
        <p className="text-stone-600 mt-1 text-sm">Visão geral da operação agora.</p>
      </div>

      <SolicitacaoApoioAlert
        solicitacoes={solicitacoesApoio.map((s) => ({
          id: s.id,
          quantidade: s.quantidade,
          clienteNome: s.cliente.nome,
          criadoEm: s.criadoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        }))}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">
            Turnos abertos agora
          </p>
          <p className="text-3xl font-bold text-navy-900 mt-1">{turnosAbertos.length}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">
            Motoboys ativos
          </p>
          <p className="text-3xl font-bold text-navy-900 mt-1">{totalMotoboysAtivos}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">
            Clientes ativos
          </p>
          <p className="text-3xl font-bold text-navy-900 mt-1">{clientesAtivos.length}</p>
        </div>
      </div>

      {equipesIncompletas.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-red-700">
            Equipe incompleta agora ({equipesIncompletas.length})
          </h2>
          <ul className="flex flex-col gap-1">
            {equipesIncompletas.map((c) => (
              <li key={c.id} className="text-sm text-red-700">
                <Link href={`/clientes/${c.id}`} className="font-medium hover:underline">
                  {c.nome}
                </Link>{" "}
                — {c.presentes} de {c.contratadas} motos no turno de{" "}
                {c.turnoAtual === "MANHA" ? "manhã" : "noite"}
              </li>
            ))}
          </ul>
        </div>
      )}

      {divergencias.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-red-700">
            Divergência entre motoboy e cliente ({divergencias.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {divergencias.map((t) => (
              <DivergenciaRow
                key={t.id}
                turnoId={t.id}
                nomeMotoboy={t.motoboy.nomeCompleto}
                nomeCliente={t.cliente.nome}
                bandasMotoboy={t.quantidadeBandas}
                taxasMotoboy={t.quantidadeTaxasExtras}
                bandasCliente={t.quantidadeBandasCliente ?? 0}
                taxasCliente={t.quantidadeTaxasExtrasCliente ?? 0}
              />
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-navy-900 mb-3">Quem está em turno agora</h2>
        {porCliente.size === 0 ? (
          <p className="text-sm text-stone-500">Nenhum motoboy com turno aberto no momento.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {[...porCliente.entries()].map(([clienteId, grupo]) => (
              <div key={clienteId} className="flex flex-col gap-2">
                <Link
                  href={`/clientes/${clienteId}`}
                  className="text-sm font-semibold text-navy-900 hover:underline"
                >
                  {grupo.nome} · {grupo.motoboys.length}{" "}
                  {grupo.motoboys.length === 1 ? "motoboy" : "motoboys"}
                </Link>
                <ul className="flex flex-col gap-1 pl-3 border-l-2 border-brand-200">
                  {grupo.motoboys.map((m) => (
                    <li key={m.id} className="text-sm text-stone-600 flex items-center gap-2">
                      {m.nome}
                      <EquipamentoBadge tipo={m.tipoEquipamento} />— desde{" "}
                      {m.horaInicio.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

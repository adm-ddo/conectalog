import Link from "next/link";
import { requireTenant, clientesResponsaveisIds } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { turnoAtivoAgora, motosContratadasNoTurno, LABEL_TURNO } from "@/lib/equipe";
import { formatarHora } from "@/lib/data";
import DashboardAutoRefresh from "../DashboardAutoRefresh";
import EquipamentoBadge from "@/components/EquipamentoBadge";
import SolicitacaoApoioAlert from "./SolicitacaoApoioAlert";
import DivergenciaRow from "./DivergenciaRow";
import type { TipoEquipamento } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

export default async function DashboardPage() {
  const sessao = await requireTenant();

  // Gestor de campo só vê o que diz respeito aos clientes que ele é
  // responsável (ver MotoboyCliente.gestor) — dono/equipe normal vê tudo
  // da cooperativa, sem esse filtro.
  const idsResponsaveis = await clientesResponsaveisIds(sessao);
  const escopoGestor = sessao.role === "GESTOR_CAMPO";
  const filtroCliente: Prisma.ClienteWhereInput = escopoGestor
    ? { id: { in: idsResponsaveis } }
    : {};

  const [turnosAbertos, totalMotoboysAtivos, clientesAtivos, solicitacoesApoio, turnosDivergentes] =
    await Promise.all([
      prisma.turno.findMany({
        where: {
          status: "ABERTO",
          motoboy: { empresaId: sessao.empresaEfetivoId },
          cliente: filtroCliente,
        },
        orderBy: { horaInicio: "asc" },
        select: {
          id: true,
          horaInicio: true,
          motoboy: { select: { nomeCompleto: true, tipoEquipamento: true } },
          cliente: { select: { id: true, nome: true } },
        },
      }),
      escopoGestor
        ? prisma.motoboyCliente
            .findMany({
              where: { clienteId: { in: idsResponsaveis }, liberado: true },
              select: { motoboyId: true },
              distinct: ["motoboyId"],
            })
            .then((r) => r.length)
        : prisma.motoboy.count({ where: { empresaId: sessao.empresaEfetivoId, ativo: true } }),
      prisma.cliente.findMany({
        where: { empresaId: sessao.empresaEfetivoId, ativo: true, ...filtroCliente },
      }),
      prisma.solicitacaoApoio.findMany({
        where: {
          status: "PENDENTE",
          cliente: { empresaId: sessao.empresaEfetivoId, ...filtroCliente },
        },
        orderBy: { criadoEm: "asc" },
        include: { cliente: { select: { nome: true } } },
      }),
      prisma.turno.findMany({
        where: {
          motoboy: { empresaId: sessao.empresaEfetivoId },
          cliente: filtroCliente,
          // Só considera divergência depois que o motoboy também encerrou o
          // turno dele (status ABERTO = quantidadeBandas ainda no padrão 0,
          // porque o cliente pode fechar o portal antes ou depois — ver
          // comentário em encerrarPeloCliente). Sem esse filtro, fechar o
          // portal primeiro sempre criava uma "divergência" falsa contra o
          // 0 provisório, e resolver isso cedo demais escondia pra sempre
          // uma divergência de verdade contra o número final do motoboy.
          status: { not: "ABERTO" },
          resolvidoDivergenciaEm: null,
          quantidadeBandasCliente: { not: null },
        },
        include: {
          motoboy: { select: { nomeCompleto: true } },
          cliente: { select: { nome: true } },
          taxaExtraItens: { orderBy: { ordem: "asc" } },
        },
      }),
    ]);

  const divergencias = turnosDivergentes.filter(
    (t) =>
      t.quantidadeBandasCliente !== t.quantidadeBandas ||
      t.taxaExtraItens.some((item) => item.quantidade !== (item.quantidadeCliente ?? 0))
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
        <p className="text-stone-600 mt-1 text-sm">
          {escopoGestor
            ? "Visão geral dos clientes que você é responsável."
            : "Visão geral da operação agora."}
        </p>
      </div>

      <SolicitacaoApoioAlert
        solicitacoes={solicitacoesApoio.map((s) => ({
          id: s.id,
          quantidade: s.quantidade,
          clienteNome: s.cliente.nome,
          criadoEm: formatarHora(s.criadoEm),
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
            {escopoGestor ? "Motoboys na sua equipe" : "Motoboys ativos"}
          </p>
          <p className="text-3xl font-bold text-navy-900 mt-1">{totalMotoboysAtivos}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">
            {escopoGestor ? "Seus clientes" : "Clientes ativos"}
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
                {escopoGestor ? (
                  <span className="font-medium">{c.nome}</span>
                ) : (
                  <Link href={`/clientes/${c.id}`} className="font-medium hover:underline">
                    {c.nome}
                  </Link>
                )}{" "}
                — {c.presentes} de {c.contratadas} motos no turno de{" "}
                {c.turnoAtual && LABEL_TURNO[c.turnoAtual]}
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
                bandasCliente={t.quantidadeBandasCliente ?? 0}
                taxas={t.taxaExtraItens.map((item) => ({
                  itemId: item.id,
                  descricao: item.descricao,
                  motoboy: item.quantidade,
                  cliente: item.quantidadeCliente ?? 0,
                }))}
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
                {escopoGestor ? (
                  <span className="text-sm font-semibold text-navy-900">
                    {grupo.nome} · {grupo.motoboys.length}{" "}
                    {grupo.motoboys.length === 1 ? "motoboy" : "motoboys"}
                  </span>
                ) : (
                  <Link
                    href={`/clientes/${clienteId}`}
                    className="text-sm font-semibold text-navy-900 hover:underline"
                  >
                    {grupo.nome} · {grupo.motoboys.length}{" "}
                    {grupo.motoboys.length === 1 ? "motoboy" : "motoboys"}
                  </Link>
                )}
                <ul className="flex flex-col gap-1 pl-3 border-l-2 border-brand-200">
                  {grupo.motoboys.map((m) => (
                    <li key={m.id} className="text-sm text-stone-600 flex items-center gap-2">
                      {m.nome}
                      <EquipamentoBadge tipo={m.tipoEquipamento} />— desde {formatarHora(m.horaInicio)}
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

import { notFound } from "next/navigation";
import { requireTenantCompleto } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { paraNumero } from "@/lib/valores";
import { turnoAtivoAgora, motosContratadasNoTurno, LABEL_TURNO } from "@/lib/equipe";
import { formatarHora, formatarData } from "@/lib/data";
import { resumoDiaCliente } from "@/lib/resumoDia";
import EditarClienteForm from "./EditarClienteForm";
import LinkPortalSection from "./LinkPortalSection";
import AvaliacoesRecebidasSection from "./AvaliacoesRecebidasSection";
import EquipamentoBadge from "@/components/EquipamentoBadge";
import ResumoDiaClienteCard from "@/components/ResumoDiaClienteCard";

export default async function ClienteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sessao = await requireTenantCompleto();
  const clienteId = Number((await params).id);

  const [cliente, mediaAvaliacoes, avaliacoesRecebidas, resumoDia] = await Promise.all([
    prisma.cliente.findFirst({
      where: { id: clienteId, empresaId: sessao.empresaEfetivoId },
      include: {
        motoboysLiberados: {
          where: { liberado: true },
          include: { motoboy: { select: { id: true, nomeCompleto: true, tipoEquipamento: true } } },
        },
        turnos: {
          where: { status: "ABERTO" },
          orderBy: { horaInicio: "asc" },
          select: {
            id: true,
            horaInicio: true,
            motoboy: { select: { nomeCompleto: true, tipoEquipamento: true } },
          },
        },
        taxasExtras: { orderBy: { ordem: "asc" } },
        turnosFixos: { orderBy: { criadoEm: "asc" } },
      },
    }),
    prisma.avaliacaoCliente.aggregate({
      where: { clienteId },
      _avg: { nota: true },
      _count: { _all: true },
    }),
    prisma.avaliacaoCliente.findMany({
      where: { clienteId },
      orderBy: { criadoEm: "desc" },
      take: 20,
      include: { motoboy: { select: { nomeCompleto: true } } },
    }),
    resumoDiaCliente(clienteId),
  ]);
  if (!cliente) notFound();

  const turnoAtual = turnoAtivoAgora(cliente);
  const contratadas = motosContratadasNoTurno(cliente, turnoAtual);
  const equipeIncompleta = turnoAtual !== null && contratadas > 0 && cliente.turnos.length < contratadas;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">{cliente.nome}</h1>
        <p className="text-stone-600 mt-1 text-sm">{cliente.endereco || "Sem endereço"}</p>
      </div>

      {equipeIncompleta && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Faltam motos no turno de {turnoAtual && LABEL_TURNO[turnoAtual]}: {cliente.turnos.length}{" "}
          de {contratadas} contratadas presentes agora.
        </div>
      )}

      <ResumoDiaClienteCard {...resumoDia} />

      <EditarClienteForm
        clienteId={cliente.id}
        valores={{
          nome: cliente.nome,
          endereco: cliente.endereco,
          turnoManhaAtivo: cliente.turnoManhaAtivo,
          turnoManhaInicio: cliente.turnoManhaInicio,
          turnoManhaFim: cliente.turnoManhaFim,
          motosFixasManha: cliente.motosFixasManha,
          turnoTardeAtivo: cliente.turnoTardeAtivo,
          turnoTardeInicio: cliente.turnoTardeInicio,
          turnoTardeFim: cliente.turnoTardeFim,
          motosFixasTarde: cliente.motosFixasTarde,
          turnoNoiteAtivo: cliente.turnoNoiteAtivo,
          turnoNoiteInicio: cliente.turnoNoiteInicio,
          turnoNoiteFim: cliente.turnoNoiteFim,
          motosFixasNoite: cliente.motosFixasNoite,
          valorBandaMotoboy: cliente.valorBandaMotoboy != null ? paraNumero(cliente.valorBandaMotoboy) : null,
          valorBandaCliente: cliente.valorBandaCliente != null ? paraNumero(cliente.valorBandaCliente) : null,
          taxasExtras: cliente.taxasExtras.map((t) => ({
            descricao: t.descricao,
            valorMotoboy: paraNumero(t.valorMotoboy),
            valorCliente: paraNumero(t.valorCliente),
          })),
          turnosFixos: cliente.turnosFixos.map((t) => ({
            nome: t.nome,
            horaInicio: t.horaInicio,
            horaFim: t.horaFim,
            diasSemana: t.diasSemana,
            valorGarantidoMotoboy: paraNumero(t.valorGarantidoMotoboy),
            valorGarantidoCliente: paraNumero(t.valorGarantidoCliente),
            bandasIncluidas: t.bandasIncluidas,
            valorExcedenteMotoboy: paraNumero(t.valorExcedenteMotoboy),
            valorExcedenteCliente: paraNumero(t.valorExcedenteCliente),
          })),
        }}
      />

      <LinkPortalSection clienteId={cliente.id} token={cliente.tokenPortal} />

      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-navy-900 mb-3">
          Em turno agora ({cliente.turnos.length})
        </h2>
        {cliente.turnos.length === 0 ? (
          <p className="text-sm text-stone-500">Ninguém em turno neste cliente agora.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {cliente.turnos.map((t) => (
              <li key={t.id} className="text-sm text-stone-700 flex items-center gap-2">
                {t.motoboy.nomeCompleto}
                <EquipamentoBadge tipo={t.motoboy.tipoEquipamento} />— desde{" "}
                {formatarHora(t.horaInicio)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-navy-900 mb-3">
          Motoboys liberados aqui ({cliente.motoboysLiberados.length})
        </h2>
        {cliente.motoboysLiberados.length === 0 ? (
          <p className="text-sm text-stone-500">
            Nenhum motoboy liberado ainda — libere pela página de cada motoboy.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {cliente.motoboysLiberados.map((mc) => (
              <li
                key={mc.id}
                className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700 flex items-center gap-1.5"
              >
                {mc.motoboy.nomeCompleto}
                <EquipamentoBadge tipo={mc.motoboy.tipoEquipamento} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <AvaliacoesRecebidasSection
        media={paraNumero(mediaAvaliacoes._avg.nota)}
        total={mediaAvaliacoes._count._all}
        avaliacoes={avaliacoesRecebidas.map((a) => ({
          id: a.id,
          nota: a.nota,
          comentario: a.comentario,
          motoboyNome: a.motoboy.nomeCompleto,
          data: formatarData(a.criadoEm),
        }))}
      />
    </div>
  );
}

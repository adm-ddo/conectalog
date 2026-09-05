import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenantCompleto } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { paraNumero } from "@/lib/valores";
import { motosContratadasNoTurno, LABEL_TURNO } from "@/lib/equipe";
import { formatarHora, formatarData, dataISOBrasil } from "@/lib/data";
import { resumoDiaCliente } from "@/lib/resumoDia";
import EditarClienteForm from "./EditarClienteForm";
import LinkPortalSection from "./LinkPortalSection";
import AvaliacoesRecebidasSection from "./AvaliacoesRecebidasSection";
import EquipamentoBadge from "@/components/EquipamentoBadge";
import ResumoDiaClienteCard from "@/components/ResumoDiaClienteCard";
import BotaoVoltar from "@/components/BotaoVoltar";
import type { TurnoEscala } from "@/generated/prisma/enums";

export default async function ClienteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sessao = await requireTenantCompleto();
  const clienteId = Number((await params).id);
  const hojeISO = dataISOBrasil();

  const [cliente, mediaAvaliacoes, avaliacoesRecebidas, resumoDia, escalasHoje] = await Promise.all([
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
            turnoPredefinido: true,
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
    prisma.escalaTurno.findMany({
      where: { clienteId, data: new Date(hojeISO) },
      select: { turno: true, statusConfirmacao: true },
    }),
  ]);
  if (!cliente) notFound();

  // Um bloco por turno que o cliente de fato usa (não só o que tá rolando
  // agora) — pra cooperativa saber desde cedo, de manhã, se a noite já
  // tem gente escalada o bastante, sem precisar esperar o turno começar.
  const turnosDoDia: { turno: TurnoEscala; label: string }[] = [
    ...(cliente.turnoManhaAtivo ? [{ turno: "MANHA" as const, label: LABEL_TURNO.MANHA }] : []),
    ...(cliente.turnoTardeAtivo ? [{ turno: "TARDE" as const, label: LABEL_TURNO.TARDE }] : []),
    ...(cliente.turnoNoiteAtivo ? [{ turno: "NOITE" as const, label: LABEL_TURNO.NOITE }] : []),
  ];
  const resumoTurnosHoje = turnosDoDia.map(({ turno, label }) => {
    const escalasDoTurno = escalasHoje.filter((e) => e.turno === turno);
    return {
      turno,
      label,
      contratadas: motosContratadasNoTurno(cliente, turno),
      escaladas: escalasDoTurno.length,
      confirmadas: escalasDoTurno.filter((e) => e.statusConfirmacao === "CONFIRMADO").length,
      presentes: cliente.turnos.filter((t) => t.turnoPredefinido === turno).length,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <BotaoVoltar />
        <h1 className="text-2xl font-semibold text-navy-900 mt-1">{cliente.nome}</h1>
        <p className="text-stone-600 mt-1 text-sm">{cliente.endereco || "Sem endereço"}</p>
      </div>

      {resumoTurnosHoje.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-navy-900 mb-3">Hoje</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {resumoTurnosHoje.map((r) => {
              const faltaEscalar = r.contratadas > 0 && r.escaladas < r.contratadas;
              const faltaGente = r.contratadas > 0 && r.presentes < r.contratadas;
              const incompleto = faltaEscalar || faltaGente;
              return (
                <Link
                  key={r.turno}
                  href={`/escala?clienteId=${clienteId}&data=${hojeISO}&turno=${r.turno}`}
                  className={`rounded-2xl border p-4 hover:border-brand-300 hover:shadow-sm transition ${
                    incompleto ? "border-red-300 bg-red-50" : "border-stone-200 bg-white"
                  }`}
                >
                  <p className="font-semibold text-navy-900 capitalize">{r.label}</p>
                  <div className="grid grid-cols-4 gap-1 mt-3 text-center">
                    <div>
                      <p className="text-lg font-bold text-navy-900">{r.contratadas}</p>
                      <p className="text-[10px] text-stone-500 leading-tight">contratadas</p>
                    </div>
                    <div>
                      <p className={`text-lg font-bold ${faltaEscalar ? "text-red-600" : "text-navy-900"}`}>
                        {r.escaladas}
                      </p>
                      <p className="text-[10px] text-stone-500 leading-tight">escaladas</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-navy-900">{r.confirmadas}</p>
                      <p className="text-[10px] text-stone-500 leading-tight">confirmaram</p>
                    </div>
                    <div>
                      <p className={`text-lg font-bold ${faltaGente ? "text-red-600" : "text-navy-900"}`}>
                        {r.presentes}
                      </p>
                      <p className="text-[10px] text-stone-500 leading-tight">presentes</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <ResumoDiaClienteCard {...resumoDia} />

      <EditarClienteForm
        clienteId={cliente.id}
        valores={{
          nome: cliente.nome,
          endereco: cliente.endereco,
          cnpj: cliente.cnpj,
          nomeResponsavelOperacional: cliente.nomeResponsavelOperacional,
          telefoneFixoOperacional: cliente.telefoneFixoOperacional,
          telefoneCelularOperacional: cliente.telefoneCelularOperacional,
          emailOperacional: cliente.emailOperacional,
          financeiroMesmoOperacional: cliente.financeiroMesmoOperacional,
          contatoFinanceiroNome: cliente.contatoFinanceiroNome,
          contatoFinanceiroEmail: cliente.contatoFinanceiroEmail,
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
            carenciaCliente: t.carenciaCliente,
            bandasIncluidasCliente: t.bandasIncluidasCliente,
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

import { requireTenantCompleto } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { formatarMoeda } from "@/lib/valores";
import { dataISOBrasil, formatarData, inicioDaSemanaBrasil } from "@/lib/data";
import MotoboyPendenciaCard, { type GrupoPendencia } from "./MotoboyPendenciaCard";
import PagamentoRow from "./PagamentoRow";
import type { FrequenciaPagamento } from "@/generated/prisma/enums";

/** Agrupa por dia (motoboy DIARIA) ou por semana fechada segunda-domingo
 * (motoboy SEMANAL), no calendário de Brasília — mesma ideia do painel de
 * pagamentos do iFreela: fecha por período, não turno a turno. */
function chaveEDataGrupo(
  horaInicio: Date,
  frequencia: FrequenciaPagamento
): { chave: string; label: string } {
  if (frequencia === "DIARIA") {
    return { chave: dataISOBrasil(horaInicio), label: formatarData(horaInicio) };
  }
  const inicioSemana = inicioDaSemanaBrasil(horaInicio);
  const fimSemana = new Date(inicioSemana.getTime() + 6 * 24 * 60 * 60 * 1000);
  return {
    chave: inicioSemana.toISOString(),
    label: `Semana de ${formatarData(inicioSemana)} a ${formatarData(fimSemana)}`,
  };
}

export default async function PagamentosPage() {
  const sessao = await requireTenantCompleto();

  const [motoboys, pagamentos] = await Promise.all([
    prisma.motoboy.findMany({
      where: { empresaId: sessao.empresaEfetivoId, ativo: true },
      orderBy: { nomeCompleto: "asc" },
      select: {
        id: true,
        nomeCompleto: true,
        frequenciaPagamento: true,
        turnos: {
          where: { status: "CONCLUIDO", pagamentoId: null },
          orderBy: { horaInicio: "asc" },
          select: {
            id: true,
            horaInicio: true,
            valorTotal: true,
            apoios: { where: { pagamentoId: null }, select: { valorTotal: true } },
          },
        },
        ocorrencias: {
          where: { pagamentoId: null },
          select: { valorDesconto: true },
        },
        vales: {
          where: { descontadoEm: null },
          select: { valor: true },
        },
        descontosAssiduidade: {
          where: { pagamentoId: null },
          select: { valorDesconto: true },
        },
      },
    }),
    prisma.pagamento.findMany({
      where: { empresaId: sessao.empresaEfetivoId },
      orderBy: { criadoEm: "desc" },
      include: { motoboy: { select: { nomeCompleto: true } } },
    }),
  ]);

  const pendencias = motoboys
    .map((m) => {
      type Acumulador = { chave: string; label: string; turnoIds: number[]; quantidadeTurnos: number; valorBrutoNumero: number };
      const gruposPorChave = new Map<string, Acumulador>();
      for (const turno of m.turnos) {
        const valorTurno =
          Number(turno.valorTotal ?? 0) + turno.apoios.reduce((s, a) => s + Number(a.valorTotal), 0);
        const { chave, label } = chaveEDataGrupo(turno.horaInicio, m.frequenciaPagamento);
        const atual: Acumulador = gruposPorChave.get(chave) ?? {
          chave,
          label,
          turnoIds: [],
          quantidadeTurnos: 0,
          valorBrutoNumero: 0,
        };
        atual.turnoIds.push(turno.id);
        atual.quantidadeTurnos += 1;
        atual.valorBrutoNumero += valorTurno;
        gruposPorChave.set(chave, atual);
      }

      const grupos: GrupoPendencia[] = [...gruposPorChave.values()]
        .sort((a, b) => a.chave.localeCompare(b.chave))
        .map((g) => ({
          chave: g.chave,
          label: g.label,
          turnoIds: g.turnoIds,
          quantidadeTurnos: g.quantidadeTurnos,
          valorBruto: formatarMoeda(g.valorBrutoNumero),
        }));

      const descontoOcorrencias = m.ocorrencias.reduce((s, o) => s + Number(o.valorDesconto), 0);
      const descontoVales = m.vales.reduce((s, v) => s + Number(v.valor), 0);
      const descontoAssiduidade = m.descontosAssiduidade.reduce((s, d) => s + Number(d.valorDesconto), 0);
      const descontosPendentes = descontoOcorrencias + descontoVales + descontoAssiduidade;

      return {
        id: m.id,
        nome: m.nomeCompleto,
        frequencia: m.frequenciaPagamento,
        grupos,
        descontosPendentes: descontosPendentes > 0 ? formatarMoeda(descontosPendentes) : null,
      };
    })
    .filter((p) => p.grupos.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Pagamentos</h1>
        <p className="text-stone-600 mt-1 text-sm">
          O PIX ainda é feito por você pelo banco — aqui é só o controle de quem já foi pago.
          Turnos agrupados por dia (recebimento diário) ou por semana fechada (recebimento
          semanal), conforme o cadastro de cada motoboy.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-navy-900 mb-3">A fechar</h2>
        {pendencias.length === 0 ? (
          <p className="text-sm text-stone-500">
            Nenhum turno concluído esperando fechamento no momento.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {pendencias.map((p) => (
              <MotoboyPendenciaCard
                key={p.id}
                motoboyId={p.id}
                nome={p.nome}
                frequencia={p.frequencia}
                grupos={p.grupos}
                descontosPendentes={p.descontosPendentes}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-navy-900 mb-3">Histórico</h2>
        {pagamentos.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhum pagamento fechado ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pagamentos.map((p) => (
              <PagamentoRow
                key={p.id}
                pagamento={{
                  id: p.id,
                  nomeMotoboy: p.motoboy.nomeCompleto,
                  periodoInicio: formatarData(p.periodoInicio),
                  periodoFim: formatarData(p.periodoFim),
                  valorTotal: formatarMoeda(p.valorTotal),
                  status: p.status,
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

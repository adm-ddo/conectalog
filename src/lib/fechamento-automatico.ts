import "server-only";
import { prisma } from "@/lib/prisma";
import { diaSemanaBrasil } from "@/lib/data";
import { calcularValores, encontrarPerfilFixo, aplicarRemuneracaoGestor } from "@/lib/precificacao";
import { paraNumero, valorEfetivo } from "@/lib/valores";
import { PRAZO_CONFIRMACAO_MIN } from "@/lib/confirmacaoBandas";
import { horaFimConfiguradaTurno } from "@/lib/horarioTurnoFixo";

const CARENCIA_MIN = PRAZO_CONFIRMACAO_MIN;

/** Fecha sozinho turno que o motoboy esqueceu de encerrar — chamada pelo
 * cron (ver vercel.json e src/app/api/cron/fechar-turnos/route.ts) duas
 * vezes por dia, mesmo espírito do fecharTurnosAtrasados do extras-app.
 *
 * Dá 2h de carência depois do horário configurado de fim do turno (pedido
 * do Thiago: motoboy ainda tem chance de encerrar direito antes do
 * sistema mexer) — só depois disso fecha sozinho, sempre com horaFim no
 * horário em que o turno deveria ter acabado (não "agora"/não o fim da
 * carência, que são só quando o sistema decidiu agir).
 *
 * A quantidade que vale nesse fechamento automático:
 * - se o CLIENTE já fechou o lado dele no portal (quantidadeBandasCliente
 *   preenchido), usa esse número — é dado real, roda pelo calcularValores
 *   normal (garantido do turno fixo incluso, taxa de gestor etc.) e já
 *   marca como resolvido (resolvidoDivergenciaEm), sem precisar de mais
 *   nada da cooperativa.
 * - se NINGUÉM confirmou nada (nem motoboy, nem cliente), fecha com 0
 *   bandas/0 valor só pra "limpar o app" (tirar do ABERTO) e fica
 *   pendente — aparece na tela de turnos pendentes (ver
 *   src/app/(painel)/turnos/pendentes/page.tsx) até a cooperativa
 *   perguntar pro motoboy e corrigir manualmente. */
export async function fecharTurnosEsquecidos(agora: Date = new Date()): Promise<{ fechados: number }> {
  const turnosAbertos = await prisma.turno.findMany({
    where: { status: "ABERTO", turnoPredefinido: { in: ["MANHA", "TARDE", "NOITE"] } },
    include: {
      cliente: { include: { turnosFixos: true } },
      motoboy: { select: { ehGestor: true, modoRemuneracaoGestor: true, valorBandaGestorEspecial: true } },
      taxaExtraItens: true,
    },
  });

  const empresaCache = new Map<number, Awaited<ReturnType<typeof prisma.empresa.findUniqueOrThrow>>>();

  let fechados = 0;
  for (const turno of turnosAbertos) {
    const horaFimConfigurada = horaFimConfiguradaTurno(turno.cliente, turno.turnoPredefinido, turno.horaInicio);
    if (horaFimConfigurada === null) continue;

    const prazoFechamento = new Date(horaFimConfigurada.getTime() + CARENCIA_MIN * 60_000);
    if (agora < prazoFechamento) continue;

    if (turno.quantidadeBandasCliente !== null) {
      if (!empresaCache.has(turno.cliente.empresaId)) {
        empresaCache.set(
          turno.cliente.empresaId,
          await prisma.empresa.findUniqueOrThrow({ where: { id: turno.cliente.empresaId } })
        );
      }
      const empresa = empresaCache.get(turno.cliente.empresaId)!;
      const quantidadeBandas = turno.quantidadeBandasCliente;

      const { valorMotoboyBandas, valorMotoboyTaxasExtras, valorCliente } = calcularValores(
        turno.cliente,
        empresa,
        turno.horaInicio,
        turno.turnoPredefinido,
        quantidadeBandas,
        turno.taxaExtraItens.map((item) => ({
          valorMotoboy: item.valorMotoboyAplicado,
          valorCliente: item.valorClienteAplicado,
          quantidade: item.quantidadeCliente ?? 0,
        }))
      );
      const valorMotoboyFinal =
        aplicarRemuneracaoGestor(valorMotoboyBandas, quantidadeBandas, turno.motoboy) + valorMotoboyTaxasExtras;
      // turnoPredefinido nunca é LIVRE aqui (query já filtrou), mas o tipo
      // de encontrarPerfilFixo não aceita LIVRE — a checagem serve só pra
      // isso, TypeScript não sabe do filtro da query.
      const perfilFixo =
        turno.turnoPredefinido !== "LIVRE"
          ? encontrarPerfilFixo(turno.cliente.turnosFixos, turno.turnoPredefinido, diaSemanaBrasil(turno.horaInicio))
          : null;
      const valorBandaAplicado = perfilFixo
        ? paraNumero(perfilFixo.valorExcedenteMotoboy)
        : valorEfetivo(turno.cliente.valorBandaMotoboy, empresa.valorBandaMotoboyPadrao);

      await prisma.$transaction([
        prisma.turno.update({
          where: { id: turno.id },
          data: {
            status: "CONCLUIDO",
            horaFim: horaFimConfigurada,
            fechamentoAutomatico: true,
            quantidadeBandas,
            quantidadeTaxasExtras: turno.quantidadeTaxasExtrasCliente ?? 0,
            valorBandaAplicado,
            valorTotal: valorMotoboyFinal,
            valorCobradoCliente: valorCliente,
            quantidadeBandasMotoboyOriginal: turno.quantidadeBandas,
            observacaoDivergencia: "Motoboy não encerrou dentro do prazo — usada a contagem do cliente.",
            resolvidoDivergenciaEm: agora,
          },
        }),
        ...turno.taxaExtraItens.map((item) =>
          prisma.turnoTaxaExtraItem.update({
            where: { id: item.id },
            data: { quantidade: item.quantidadeCliente ?? 0 },
          })
        ),
      ]);
    } else {
      await prisma.turno.update({
        where: { id: turno.id },
        data: {
          status: "CONCLUIDO",
          horaFim: horaFimConfigurada,
          fechamentoAutomatico: true,
          quantidadeBandas: 0,
          quantidadeTaxasExtras: 0,
          valorBandaAplicado: 0,
          valorTotal: 0,
          valorCobradoCliente: 0,
        },
      });
    }
    fechados++;
  }

  return { fechados };
}

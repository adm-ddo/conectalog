import "server-only";
import { prisma } from "@/lib/prisma";
import { dataISOBrasil, instanteBrasil } from "@/lib/data";
import { calcularValores, encontrarPerfilFixo, aplicarRemuneracaoGestor } from "@/lib/precificacao";
import { paraNumero, valorEfetivo } from "@/lib/valores";
import type { Cliente } from "@/generated/prisma/client";
import type { TurnoPredefinido } from "@/generated/prisma/enums";

const CARENCIA_MIN = 60;

function paraMinutos(hhmm: string | null): number | null {
  if (!hhmm) return null;
  const partes = hhmm.split(":").map(Number);
  if (partes.length !== 2 || partes.some(Number.isNaN)) return null;
  return partes[0] * 60 + partes[1];
}

/** Horário configurado de fim do turno (em minutos desde meia-noite) pro
 * perfil manhã/tarde/noite desse Cliente — null se o turno não é um
 * desses três (LIVRE não tem horário configurado, nunca é fechado
 * sozinho) ou se o Cliente desativou/não configurou esse turno depois que
 * o motoboy já tinha começado (não fecha um turno sem saber até quando
 * ele deveria ir). */
function minutosFimConfigurado(
  cliente: Pick<
    Cliente,
    "turnoManhaAtivo" | "turnoManhaFim" | "turnoTardeAtivo" | "turnoTardeFim" | "turnoNoiteAtivo" | "turnoNoiteFim"
  >,
  turno: TurnoPredefinido
): number | null {
  if (turno === "MANHA") return cliente.turnoManhaAtivo ? paraMinutos(cliente.turnoManhaFim) : null;
  if (turno === "TARDE") return cliente.turnoTardeAtivo ? paraMinutos(cliente.turnoTardeFim) : null;
  if (turno === "NOITE") return cliente.turnoNoiteAtivo ? paraMinutos(cliente.turnoNoiteFim) : null;
  return null;
}

/** Fecha sozinho turno que o motoboy esqueceu de encerrar — chamada pelo
 * cron (ver vercel.json e src/app/api/cron/fechar-turnos/route.ts) duas
 * vezes por dia, mesmo espírito do fecharTurnosAtrasados do extras-app.
 *
 * Dá 1h de carência depois do horário configurado de fim do turno (pedido
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
    const minutosFim = minutosFimConfigurado(turno.cliente, turno.turnoPredefinido);
    if (minutosFim === null) continue;

    const dataInicioISO = dataISOBrasil(turno.horaInicio);
    let horaFimConfigurada = instanteBrasil(dataInicioISO, minutosFim);
    // Turno que cruza a meia-noite (ex.: 22:00-05:00): o fim configurado
    // em minutos-do-dia é menor que o início, então o fim de verdade é no
    // dia seguinte ao início.
    if (horaFimConfigurada <= turno.horaInicio) {
      horaFimConfigurada = new Date(horaFimConfigurada.getTime() + 24 * 60 * 60_000);
    }
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

      const { valorMotoboy, valorCliente } = calcularValores(
        turno.cliente,
        empresa,
        turno.horaInicio,
        quantidadeBandas,
        turno.taxaExtraItens.map((item) => ({
          valorMotoboy: item.valorMotoboyAplicado,
          valorCliente: item.valorClienteAplicado,
          quantidade: item.quantidadeCliente ?? 0,
        }))
      );
      const totalTaxasMotoboy = turno.taxaExtraItens.reduce(
        (soma, item) => soma + (item.quantidadeCliente ?? 0) * paraNumero(item.valorMotoboyAplicado),
        0
      );
      const valorMotoboyFinal =
        aplicarRemuneracaoGestor(valorMotoboy - totalTaxasMotoboy, quantidadeBandas, turno.motoboy) +
        totalTaxasMotoboy;
      const perfilFixo = encontrarPerfilFixo(turno.cliente.turnosFixos, turno.horaInicio);
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

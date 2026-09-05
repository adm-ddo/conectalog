import "server-only";
import { prisma } from "@/lib/prisma";
import { dataISOBrasil, instanteBrasil } from "@/lib/data";
import type { Cliente } from "@/generated/prisma/client";
import type { TurnoPredefinido } from "@/generated/prisma/enums";

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
 * horaFim vira o horário em que o turno configurado do Cliente deveria
 * ter acabado (não "agora", que é só quando o cron rodou) — se isso já
 * passou, fecha com 0 bandas/0 valor (não passa pelo calcularValores
 * normal: o garantido do turno fixo não faz sentido pra um turno que
 * ninguém confirmou ter acontecido de verdade). A cooperativa corrige
 * depois na tela do turno assim que souber quantas entregas ele fez
 * (atualizarBandasFechamentoAutomatico, em src/app/(painel)/turnos/[id]/actions.ts). */
export async function fecharTurnosEsquecidos(agora: Date = new Date()): Promise<{ fechados: number }> {
  const turnosAbertos = await prisma.turno.findMany({
    where: { status: "ABERTO", turnoPredefinido: { in: ["MANHA", "TARDE", "NOITE"] } },
    include: { cliente: true },
  });

  let fechados = 0;
  for (const turno of turnosAbertos) {
    const minutosFim = minutosFimConfigurado(turno.cliente, turno.turnoPredefinido);
    if (minutosFim === null) continue;

    const dataInicioISO = dataISOBrasil(turno.horaInicio);
    let horaFimPrevista = instanteBrasil(dataInicioISO, minutosFim);
    // Turno que cruza a meia-noite (ex.: 22:00-05:00): o fim configurado
    // em minutos-do-dia é menor que o início, então o fim de verdade é no
    // dia seguinte ao início.
    if (horaFimPrevista <= turno.horaInicio) {
      horaFimPrevista = new Date(horaFimPrevista.getTime() + 24 * 60 * 60_000);
    }
    if (agora < horaFimPrevista) continue;

    await prisma.turno.update({
      where: { id: turno.id },
      data: {
        status: "CONCLUIDO",
        horaFim: horaFimPrevista,
        quantidadeBandas: 0,
        quantidadeTaxasExtras: 0,
        valorBandaAplicado: 0,
        valorTotal: 0,
        valorCobradoCliente: 0,
        fechamentoAutomatico: true,
      },
    });
    fechados++;
  }

  return { fechados };
}

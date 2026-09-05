import "server-only";
import { prisma } from "@/lib/prisma";
import { instanteBrasil } from "@/lib/data";
import type { TurnoEscala } from "@/generated/prisma/enums";
import type { Cliente } from "@/generated/prisma/client";

/** Motoboy tem até 1h antes do horário configurado de início do turno pra
 * confirmar a escala — depois disso ela "cai" sozinha (statusConfirmacao
 * vira EXPIRADA) e a cooperativa já sabe que precisa escalar outro.
 * Pedido do Thiago pra criar urgência de resposta: sem prazo, motoboy
 * podia deixar pra responder "depois" indefinidamente. */
export const PRAZO_CONFIRMACAO_MIN = 60;

function paraMinutos(hhmm: string | null): number | null {
  if (!hhmm) return null;
  const partes = hhmm.split(":").map(Number);
  if (partes.length !== 2 || partes.some(Number.isNaN)) return null;
  return partes[0] * 60 + partes[1];
}

const CAMPO_HORARIO_INICIO = {
  MANHA: "turnoManhaInicio",
  TARDE: "turnoTardeInicio",
  NOITE: "turnoNoiteInicio",
} as const;

type ClienteComHorarios = Pick<Cliente, "turnoManhaInicio" | "turnoTardeInicio" | "turnoNoiteInicio">;

/** EscalaTurno.data é @db.Date — meia-noite UTC do dia certo, sem fuso;
 * getUTC* evita jogar pro dia anterior (mesmo motivo de
 * inicioDoDiaBrasilDeDataCalendario em escala/actions.ts). */
function dataISODeCalendario(data: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${data.getUTCFullYear()}-${pad(data.getUTCMonth() + 1)}-${pad(data.getUTCDate())}`;
}

/** Instante (Brasília) em que a confirmação dessa escala vence — null se
 * o Cliente não tem horário de início configurado pra esse turno (nesse
 * caso a escala nunca expira sozinha, não tem prazo pra comparar). */
export function prazoConfirmacao(
  cliente: ClienteComHorarios,
  turno: TurnoEscala,
  data: Date
): Date | null {
  const minutosInicio = paraMinutos(cliente[CAMPO_HORARIO_INICIO[turno]]);
  if (minutosInicio === null) return null;
  const inicioAgendado = instanteBrasil(dataISODeCalendario(data), minutosInicio);
  return new Date(inicioAgendado.getTime() - PRAZO_CONFIRMACAO_MIN * 60_000);
}

/** Faz cair sozinha (PENDENTE -> EXPIRADA) toda escala que passou do
 * prazo de confirmação sem resposta e sem o motoboy ter batido o ponto
 * (turnoId ainda null — se ele já chegou, vincularEscalaSeExistir já
 * confirmou de verdade, nem entra nessa varredura).
 *
 * Chamada de forma "preguiçosa" sempre que alguém abre uma tela de
 * escala — painel ou app do motoboy, as duas com auto-refresh de 30s —
 * em vez de depender só do cron (que hoje roda 2x/dia, frequência baixa
 * demais pra gerar a urgência que o Thiago pediu). O cron
 * (fechar-turnos) continua chamando isso também, só como rede de
 * segurança pros dias em que ninguém abre nenhuma tela.
 *
 * `empresaId`/`motoboyId` restringem a varredura quando quem chamou já
 * sabe o escopo (painel sabe a empresa, app do motoboy sabe só o próprio
 * motoboy); a chamada do cron varre tudo. */
export async function expirarEscalasVencidas(
  agora: Date = new Date(),
  escopo?: { empresaId?: number; motoboyId?: number }
): Promise<{ expiradas: number }> {
  const pendentes = await prisma.escalaTurno.findMany({
    where: {
      statusConfirmacao: "PENDENTE",
      turnoId: null,
      ...(escopo?.empresaId ? { cliente: { empresaId: escopo.empresaId } } : {}),
      ...(escopo?.motoboyId ? { motoboyId: escopo.motoboyId } : {}),
    },
    select: {
      id: true,
      turno: true,
      data: true,
      cliente: { select: { turnoManhaInicio: true, turnoTardeInicio: true, turnoNoiteInicio: true } },
    },
  });

  const idsVencidos = pendentes
    .filter((e) => {
      const prazo = prazoConfirmacao(e.cliente, e.turno, e.data);
      return prazo !== null && agora >= prazo;
    })
    .map((e) => e.id);

  if (idsVencidos.length === 0) return { expiradas: 0 };

  await prisma.escalaTurno.updateMany({
    where: { id: { in: idsVencidos } },
    data: { statusConfirmacao: "EXPIRADA" },
  });

  return { expiradas: idsVencidos.length };
}

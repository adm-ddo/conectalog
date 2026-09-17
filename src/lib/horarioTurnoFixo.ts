import "server-only";
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
 * desses três (LIVRE não tem horário configurado) ou se o Cliente
 * desativou/não configurou esse turno depois que o motoboy já tinha
 * começado. */
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

/** Instante completo em que o turno configurado (manhã/tarde/noite)
 * deveria acabar, dado quando ele começou — null se não há horário
 * configurado (turno LIVRE, ou perfil desativado). Já resolve virada de
 * meia-noite: se o fim configurado (minutos-do-dia) for menor ou igual
 * ao início, o fim de verdade é no dia seguinte ao início (turno tipo
 * 22:00-05:00). Compartilhado entre o fechamento automático por cron
 * (fechamento-automatico.ts) e o encerramento manual pelo gestor
 * (turnos/[id]/actions.ts), pra manter a mesma noção de "horário que o
 * turno deveria ter acabado" nos dois lugares. */
export function horaFimConfiguradaTurno(
  cliente: Pick<
    Cliente,
    "turnoManhaAtivo" | "turnoManhaFim" | "turnoTardeAtivo" | "turnoTardeFim" | "turnoNoiteAtivo" | "turnoNoiteFim"
  >,
  turnoPredefinido: TurnoPredefinido,
  horaInicio: Date
): Date | null {
  const minutosFim = minutosFimConfigurado(cliente, turnoPredefinido);
  if (minutosFim === null) return null;

  const dataInicioISO = dataISOBrasil(horaInicio);
  let horaFim = instanteBrasil(dataInicioISO, minutosFim);
  if (horaFim <= horaInicio) {
    horaFim = new Date(horaFim.getTime() + 24 * 60 * 60_000);
  }
  return horaFim;
}

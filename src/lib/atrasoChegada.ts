import { minutosDesdeMeiaNoiteBrasil } from "@/lib/data";
import type { Cliente } from "@/generated/prisma/client";

const CAMPO_HORARIO_INICIO = {
  MANHA: "turnoManhaInicio",
  TARDE: "turnoTardeInicio",
  NOITE: "turnoNoiteInicio",
} as const;

function paraMinutos(hhmm: string | null): number | null {
  if (!hhmm) return null;
  const partes = hhmm.split(":").map(Number);
  if (partes.length !== 2 || partes.some(Number.isNaN)) return null;
  return partes[0] * 60 + partes[1];
}

/** Quantos minutos de atraso essa chegada teve, comparando `horaChegada`
 * com o horário configurado do turno (manhã/tarde/noite) do Cliente —
 * null se não dá pra calcular (turno livre/fora de horário, ou Cliente
 * sem esse horário configurado). Pode dar negativo (chegou adiantado).
 * Mesma lógica de virada de meia-noite de
 * registrarDescontoAssiduidadeSeAtrasado (turno/iniciar/actions.ts), mas
 * essa aqui é pura (sem Prisma) — só pra exibição, não gera desconto. */
export function minutosAtrasoChegada(
  cliente: Pick<Cliente, "turnoManhaInicio" | "turnoTardeInicio" | "turnoNoiteInicio">,
  turnoBalde: "MANHA" | "TARDE" | "NOITE" | null,
  horaChegada: Date
): number | null {
  if (turnoBalde === null) return null;

  const minutosAgendados = paraMinutos(cliente[CAMPO_HORARIO_INICIO[turnoBalde]]);
  if (minutosAgendados === null) return null;

  const minutosChegada = minutosDesdeMeiaNoiteBrasil(horaChegada);
  let atraso = minutosChegada - minutosAgendados;
  if (atraso < -12 * 60) atraso += 24 * 60; // turno cruzou meia-noite entre o horário marcado e a chegada
  return atraso;
}

/** true quando a chegada passou da tolerância configurada nesse Cliente
 * (Cliente.toleranciaChegadaMinutos) — usado só pra sinalização visual
 * (vermelho) nas telas, nunca pra gerar desconto sozinho. */
export function chegouAtrasado(
  cliente: Pick<
    Cliente,
    "turnoManhaInicio" | "turnoTardeInicio" | "turnoNoiteInicio" | "toleranciaChegadaMinutos"
  >,
  turnoBalde: "MANHA" | "TARDE" | "NOITE" | null,
  horaChegada: Date
): boolean {
  const atraso = minutosAtrasoChegada(cliente, turnoBalde, horaChegada);
  return atraso !== null && atraso >= cliente.toleranciaChegadaMinutos;
}

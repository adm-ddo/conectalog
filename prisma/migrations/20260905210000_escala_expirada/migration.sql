-- Escala não confirmada até 1h antes do horário configurado de início do
-- turno "cai" sozinha (vira EXPIRADA) — ver src/lib/escala.ts.
ALTER TYPE "StatusConfirmacaoEscala" ADD VALUE 'EXPIRADA';

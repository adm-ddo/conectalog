-- Marca turnos fechados sozinhos pelo cron (motoboy esqueceu de
-- encerrar) — nascem com 0 bandas/0 valor até a cooperativa corrigir.
ALTER TABLE "Turno" ADD COLUMN "fechamentoAutomatico" BOOLEAN NOT NULL DEFAULT false;

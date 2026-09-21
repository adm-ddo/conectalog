-- AlterTable: tolerância de atraso na chegada por cliente, puramente
-- visual (não gera desconto sozinho).
ALTER TABLE "Cliente" ADD COLUMN "toleranciaChegadaMinutos" INTEGER NOT NULL DEFAULT 30;

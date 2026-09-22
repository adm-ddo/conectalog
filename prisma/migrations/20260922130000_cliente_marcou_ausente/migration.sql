-- AlterTable: sinal explícito do CLIENTE de que o motoboy nunca esteve
-- fisicamente presente — diferente de quantidadeBandasCliente=0 (ver
-- comentário em Turno.clienteMarcouAusente).
ALTER TABLE "Turno" ADD COLUMN "clienteMarcouAusente" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "clienteMarcouAusenteEm" TIMESTAMP(3);

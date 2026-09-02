-- Turno "Tarde" vira um turno completo, igual manhã/noite (escala, moto
-- fixa por dia da semana, iniciar turno no app).
ALTER TYPE "TurnoPredefinido" ADD VALUE 'TARDE';
ALTER TYPE "TurnoEscala" ADD VALUE 'TARDE';

-- CreateTable / AlterTable: turno tarde no Cliente, mesmo padrão de
-- manhã/noite.
ALTER TABLE "Cliente" ADD COLUMN "turnoTardeAtivo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Cliente" ADD COLUMN "turnoTardeInicio" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "turnoTardeFim" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "motosFixasTarde" INTEGER[] NOT NULL DEFAULT ARRAY[0,0,0,0,0,0,0];

-- "Valor fixo por turno" deixa de ser um único valor (diária) e vira uma
-- lista de perfis por Cliente (horário + dias da semana + valor
-- garantido/limite/excedente) — cada empresa cliente usa isso do seu
-- jeito (ex.: domingo à noite com valor diferente do resto da semana).
CREATE TABLE "ClienteTurnoFixo" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFim" TEXT NOT NULL,
    "diasSemana" INTEGER[],
    "valorGarantidoMotoboy" DECIMAL(10,2) NOT NULL,
    "valorGarantidoCliente" DECIMAL(10,2) NOT NULL,
    "bandasIncluidas" INTEGER NOT NULL,
    "valorExcedenteMotoboy" DECIMAL(10,2) NOT NULL,
    "valorExcedenteCliente" DECIMAL(10,2) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClienteTurnoFixo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClienteTurnoFixo_clienteId_idx" ON "ClienteTurnoFixo"("clienteId");

ALTER TABLE "ClienteTurnoFixo" ADD CONSTRAINT "ClienteTurnoFixo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: cliente que já usava o modelo antigo (diária única) ganha um
-- perfil "Diária" valendo o dia inteiro, todo dia da semana — preserva o
-- preço já configurado, só muda a estrutura.
INSERT INTO "ClienteTurnoFixo" ("clienteId", "nome", "horaInicio", "horaFim", "diasSemana", "valorGarantidoMotoboy", "valorGarantidoCliente", "bandasIncluidas", "valorExcedenteMotoboy", "valorExcedenteCliente")
SELECT
    c."id",
    'Diária',
    '00:00',
    '23:59',
    ARRAY[0,1,2,3,4,5,6],
    c."valorDiariaMotoboy",
    COALESCE(c."valorDiariaCliente", c."valorDiariaMotoboy"),
    COALESCE(c."bandasIncluidasNaDiaria", 0),
    COALESCE(c."valorBandaExcedenteMotoboy", 0),
    COALESCE(c."valorBandaExcedenteCliente", 0)
FROM "Cliente" c
WHERE c."valorDiariaMotoboy" IS NOT NULL;

ALTER TABLE "Cliente" DROP COLUMN "valorDiariaMotoboy";
ALTER TABLE "Cliente" DROP COLUMN "valorDiariaCliente";
ALTER TABLE "Cliente" DROP COLUMN "bandasIncluidasNaDiaria";
ALTER TABLE "Cliente" DROP COLUMN "valorBandaExcedenteMotoboy";
ALTER TABLE "Cliente" DROP COLUMN "valorBandaExcedenteCliente";

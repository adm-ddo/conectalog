-- AlterTable
ALTER TABLE "Motoboy" ADD COLUMN "aprovadoEm" TIMESTAMP(3);

-- Backfill: todo motoboy já existente veio de um fluxo que já era
-- implicitamente aprovado (link da cooperativa ou cadastro manual dela) —
-- só quem se cadastrar pelo novo fluxo de "pedir vaga" nasce com null.
UPDATE "Motoboy" SET "aprovadoEm" = "criadoEm" WHERE "aprovadoEm" IS NULL;

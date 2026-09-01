-- motosFixasManha/Noite passam de um número único pra um array de 7
-- posições (índice = domingo..sábado), pra cooperativa poder configurar
-- quantidade diferente de moto fixa por dia da semana.
ALTER TABLE "Cliente" ADD COLUMN "motosFixasManhaTmp" INTEGER[] NOT NULL DEFAULT ARRAY[0,0,0,0,0,0,0];
ALTER TABLE "Cliente" ADD COLUMN "motosFixasNoiteTmp" INTEGER[] NOT NULL DEFAULT ARRAY[0,0,0,0,0,0,0];

-- Preserva o valor antigo replicando ele nos 7 dias (era o mesmo valor
-- todo dia antes desta migração).
UPDATE "Cliente" SET "motosFixasManhaTmp" = ARRAY_FILL(COALESCE("motosFixasManha", 0), ARRAY[7]);
UPDATE "Cliente" SET "motosFixasNoiteTmp" = ARRAY_FILL(COALESCE("motosFixasNoite", 0), ARRAY[7]);

ALTER TABLE "Cliente" DROP COLUMN "motosFixasManha";
ALTER TABLE "Cliente" DROP COLUMN "motosFixasNoite";
ALTER TABLE "Cliente" RENAME COLUMN "motosFixasManhaTmp" TO "motosFixasManha";
ALTER TABLE "Cliente" RENAME COLUMN "motosFixasNoiteTmp" TO "motosFixasNoite";

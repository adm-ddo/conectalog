-- AlterTable: turnoId vira opcional (apoio avulso de motoboy livre não
-- tem turno de base) e motoboyId passa a ser preenchido direto (sem
-- depender mais de navegar por Turno pra saber de quem é o apoio).
ALTER TABLE "Apoio" ALTER COLUMN "turnoId" DROP NOT NULL;
ALTER TABLE "Apoio" ADD COLUMN "motoboyId" INTEGER;

-- Backfill: todo apoio existente até aqui sempre teve turno, então dá
-- pra preencher motoboyId a partir dele.
UPDATE "Apoio" a
SET "motoboyId" = t."motoboyId"
FROM "Turno" t
WHERE t.id = a."turnoId";

ALTER TABLE "Apoio" ALTER COLUMN "motoboyId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Apoio" ADD CONSTRAINT "Apoio_motoboyId_fkey" FOREIGN KEY ("motoboyId") REFERENCES "Motoboy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Apoio_motoboyId_idx" ON "Apoio"("motoboyId");

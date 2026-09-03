-- AlterTable
ALTER TABLE "Turno" ADD COLUMN "quantidadeBandasMotoboyOriginal" INTEGER,
ADD COLUMN "resolvidoPorUsuarioId" INTEGER,
ADD COLUMN "observacaoDivergencia" TEXT;

-- AlterTable
ALTER TABLE "TurnoTaxaExtraItem" ADD COLUMN "quantidadeMotoboyOriginal" INTEGER;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_resolvidoPorUsuarioId_fkey" FOREIGN KEY ("resolvidoPorUsuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

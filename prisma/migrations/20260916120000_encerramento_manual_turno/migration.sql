-- AlterTable
ALTER TABLE "Turno" ADD COLUMN "encerradoManualmente" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "encerradoManualmenteEm" TIMESTAMP(3),
ADD COLUMN "encerradoManualmentePorUsuarioId" INTEGER,
ADD COLUMN "observacaoEncerramentoManual" TEXT;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_encerradoManualmentePorUsuarioId_fkey" FOREIGN KEY ("encerradoManualmentePorUsuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

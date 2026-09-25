-- AlterTable: gestor marca que teve problema técnico (pane na moto) ou
-- pessoal/familiar que fez o motoboy sair antes de terminar um turno que
-- seria "diária" — remove a diária e cobra/paga só pelas bandas feitas
-- (ver comentário em Turno.problemaTecnico).
ALTER TABLE "Turno" ADD COLUMN "problemaTecnico" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "problemaTecnicoEm" TIMESTAMP(3),
ADD COLUMN "problemaTecnicoPorUsuarioId" INTEGER,
ADD COLUMN "observacaoProblemaTecnico" TEXT;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_problemaTecnicoPorUsuarioId_fkey" FOREIGN KEY ("problemaTecnicoPorUsuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

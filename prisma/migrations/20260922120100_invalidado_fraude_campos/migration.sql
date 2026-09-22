-- AlterTable: registro de quem invalidou um turno por suspeita de fraude,
-- quando, e por quê (motivo obrigatório na aplicação) — ver comentário em
-- Turno.invalidadoFraudeEm.
ALTER TABLE "Turno" ADD COLUMN "invalidadoFraudeEm" TIMESTAMP(3),
ADD COLUMN "invalidadoFraudePorUsuarioId" INTEGER,
ADD COLUMN "motivoFraude" TEXT;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_invalidadoFraudePorUsuarioId_fkey" FOREIGN KEY ("invalidadoFraudePorUsuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

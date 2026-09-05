-- Motoboy passa a poder confirmar/recusar uma escala pela tela "Minha
-- escala" do app — dashboard da cooperativa usa isso pra saber quantos
-- já "de fato aceitaram" a escala, não só quantos foram escalados.
CREATE TYPE "StatusConfirmacaoEscala" AS ENUM ('PENDENTE', 'CONFIRMADO', 'RECUSADO');

ALTER TABLE "EscalaTurno" ADD COLUMN "statusConfirmacao" "StatusConfirmacaoEscala" NOT NULL DEFAULT 'PENDENTE';
ALTER TABLE "EscalaTurno" ADD COLUMN "confirmadoEm" TIMESTAMP(3);

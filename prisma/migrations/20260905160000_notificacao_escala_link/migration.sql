-- Liga a notificação de "você foi escalado" na escala de verdade, pra
-- dar pra confirmar/recusar direto no banner da notificação (sem precisar
-- ir na tela "Minha escala").
ALTER TABLE "Notificacao" ADD COLUMN "escalaId" INTEGER;

ALTER TABLE "Notificacao"
  ADD CONSTRAINT "Notificacao_escalaId_fkey"
  FOREIGN KEY ("escalaId") REFERENCES "EscalaTurno"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Notificacao_escalaId_idx" ON "Notificacao"("escalaId");

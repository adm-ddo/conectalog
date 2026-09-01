-- Aviso pro motoboy dentro do app (ex.: "você foi escalado") — lista de
-- notificações simples, com "lida" pra marcar como vista.
CREATE TYPE "TipoNotificacao" AS ENUM ('ESCALADO');

CREATE TABLE "Notificacao" (
    "id" SERIAL NOT NULL,
    "motoboyId" INTEGER NOT NULL,
    "tipo" "TipoNotificacao" NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notificacao_motoboyId_lida_idx" ON "Notificacao"("motoboyId", "lida");

ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_motoboyId_fkey" FOREIGN KEY ("motoboyId") REFERENCES "Motoboy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

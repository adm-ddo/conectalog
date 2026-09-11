-- Inscrição de push web do motoboy (notificação real no celular, mesmo
-- com o app fechado) — ver comentário completo no schema.
CREATE TABLE "PushSubscription" (
    "id" SERIAL NOT NULL,
    "motoboyId" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

CREATE INDEX "PushSubscription_motoboyId_idx" ON "PushSubscription"("motoboyId");

ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_motoboyId_fkey" FOREIGN KEY ("motoboyId") REFERENCES "Motoboy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: link separado do tokenPortal, pro painel de gestão
-- (relatório por período + escala) — nasce null, opt-in.
ALTER TABLE "Cliente" ADD COLUMN "tokenGestao" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_tokenGestao_key" ON "Cliente"("tokenGestao");

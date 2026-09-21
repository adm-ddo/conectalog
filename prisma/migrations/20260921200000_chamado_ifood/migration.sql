-- CreateTable: chamado de iFood feito pelo restaurante quando a
-- cooperativa não mandou moto suficiente — o excedente sobre a banda
-- normal do cliente é descontado no fechamento (ver comentário no
-- schema).
CREATE TABLE "ChamadoIfood" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "numeroPedidoSaipos" TEXT NOT NULL,
    "numeroPedidoIfood" TEXT NOT NULL,
    "valorIfood" DECIMAL(10,2) NOT NULL,
    "valorBandaClienteAplicado" DECIMAL(10,2) NOT NULL,
    "valorDesconto" DECIMAL(10,2) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChamadoIfood_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChamadoIfood_clienteId_criadoEm_idx" ON "ChamadoIfood"("clienteId", "criadoEm");

ALTER TABLE "ChamadoIfood" ADD CONSTRAINT "ChamadoIfood_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

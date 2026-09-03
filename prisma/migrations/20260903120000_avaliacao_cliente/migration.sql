-- CreateTable
CREATE TABLE "AvaliacaoCliente" (
    "id" SERIAL NOT NULL,
    "turnoId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "motoboyId" INTEGER NOT NULL,
    "nota" INTEGER NOT NULL,
    "comentario" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvaliacaoCliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AvaliacaoCliente_turnoId_key" ON "AvaliacaoCliente"("turnoId");

-- CreateIndex
CREATE INDEX "AvaliacaoCliente_clienteId_idx" ON "AvaliacaoCliente"("clienteId");

-- AddForeignKey
ALTER TABLE "AvaliacaoCliente" ADD CONSTRAINT "AvaliacaoCliente_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvaliacaoCliente" ADD CONSTRAINT "AvaliacaoCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvaliacaoCliente" ADD CONSTRAINT "AvaliacaoCliente_motoboyId_fkey" FOREIGN KEY ("motoboyId") REFERENCES "Motoboy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

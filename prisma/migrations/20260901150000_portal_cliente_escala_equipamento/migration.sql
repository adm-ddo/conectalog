-- CreateEnum
CREATE TYPE "TipoEquipamento" AS ENUM ('BAG', 'BAU_PEQUENO', 'BAU_MEDIO', 'BAU_GRANDE');

-- CreateEnum
CREATE TYPE "TurnoEscala" AS ENUM ('MANHA', 'NOITE');

-- Motoboy: equipamento de entrega
ALTER TABLE "Motoboy" ADD COLUMN "tipoEquipamento" "TipoEquipamento";

-- Cliente: acesso ao portal
ALTER TABLE "Cliente" ADD COLUMN "loginPortal" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "senhaHashPortal" TEXT;
CREATE UNIQUE INDEX "Cliente_loginPortal_key" ON "Cliente"("loginPortal");

-- CreateTable
CREATE TABLE "SessaoCliente" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessaoCliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscalaTurno" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "motoboyId" INTEGER NOT NULL,
    "data" DATE NOT NULL,
    "turno" "TurnoEscala" NOT NULL,
    "turnoId" INTEGER,
    "criadoPorUsuarioId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscalaTurno_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessaoCliente_token_key" ON "SessaoCliente"("token");

-- CreateIndex
CREATE UNIQUE INDEX "EscalaTurno_clienteId_motoboyId_data_turno_key" ON "EscalaTurno"("clienteId", "motoboyId", "data", "turno");

-- CreateIndex
CREATE INDEX "EscalaTurno_clienteId_data_idx" ON "EscalaTurno"("clienteId", "data");

-- AddForeignKey
ALTER TABLE "SessaoCliente" ADD CONSTRAINT "SessaoCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalaTurno" ADD CONSTRAINT "EscalaTurno_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalaTurno" ADD CONSTRAINT "EscalaTurno_motoboyId_fkey" FOREIGN KEY ("motoboyId") REFERENCES "Motoboy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalaTurno" ADD CONSTRAINT "EscalaTurno_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalaTurno" ADD CONSTRAINT "EscalaTurno_criadoPorUsuarioId_fkey" FOREIGN KEY ("criadoPorUsuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

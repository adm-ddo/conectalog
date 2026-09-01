-- Cliente: troca login/senha do portal por token na URL (padrão totem)
DROP INDEX IF EXISTS "Cliente_loginPortal_key";
ALTER TABLE "Cliente" DROP COLUMN IF EXISTS "loginPortal";
ALTER TABLE "Cliente" DROP COLUMN IF EXISTS "senhaHashPortal";
ALTER TABLE "Cliente" ADD COLUMN "tokenPortal" TEXT;
CREATE UNIQUE INDEX "Cliente_tokenPortal_key" ON "Cliente"("tokenPortal");

-- Remove a sessão de login do cliente (não existe mais)
DROP TABLE IF EXISTS "SessaoCliente";

-- Turno: contagem do cliente (restaurante) + resolução de divergência
ALTER TABLE "Turno" ADD COLUMN "quantidadeBandasCliente" INTEGER;
ALTER TABLE "Turno" ADD COLUMN "quantidadeTaxasExtrasCliente" INTEGER;
ALTER TABLE "Turno" ADD COLUMN "resolvidoDivergenciaEm" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Avaliacao" (
    "id" SERIAL NOT NULL,
    "turnoId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "motoboyId" INTEGER NOT NULL,
    "nota" INTEGER NOT NULL,
    "comentario" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Avaliacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Avaliacao_turnoId_key" ON "Avaliacao"("turnoId");

-- CreateIndex
CREATE INDEX "Avaliacao_motoboyId_idx" ON "Avaliacao"("motoboyId");

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_motoboyId_fkey" FOREIGN KEY ("motoboyId") REFERENCES "Motoboy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "StatusSolicitacaoApoio" AS ENUM ('PENDENTE', 'A_CAMINHO', 'SEM_MOTO');

-- CreateTable
CREATE TABLE "SolicitacaoApoio" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "status" "StatusSolicitacaoApoio" NOT NULL DEFAULT 'PENDENTE',
    "respondidoPorUsuarioId" INTEGER,
    "respondidoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitacaoApoio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SolicitacaoApoio_clienteId_status_idx" ON "SolicitacaoApoio"("clienteId", "status");

-- AddForeignKey
ALTER TABLE "SolicitacaoApoio" ADD CONSTRAINT "SolicitacaoApoio_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoApoio" ADD CONSTRAINT "SolicitacaoApoio_respondidoPorUsuarioId_fkey" FOREIGN KEY ("respondidoPorUsuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

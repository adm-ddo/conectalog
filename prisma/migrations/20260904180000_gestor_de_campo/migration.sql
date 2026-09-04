-- CreateEnum
CREATE TYPE "ModoRemuneracaoGestor" AS ENUM ('PADRAO', 'VALOR_ESPECIAL', 'NAO_CONTABILIZA');

-- AlterEnum
ALTER TYPE "RoleUsuario" ADD VALUE 'GESTOR_CAMPO';

-- AlterTable
ALTER TABLE "MotoboyCliente" ADD COLUMN "gestor" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "MotoboyCliente_clienteId_gestor_idx" ON "MotoboyCliente"("clienteId", "gestor");

-- AlterTable
ALTER TABLE "Motoboy" ADD COLUMN "ehGestor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "modoRemuneracaoGestor" "ModoRemuneracaoGestor" NOT NULL DEFAULT 'PADRAO',
ADD COLUMN "valorBandaGestorEspecial" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "motoboyVinculadoId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_motoboyVinculadoId_key" ON "Usuario"("motoboyVinculadoId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_motoboyVinculadoId_fkey" FOREIGN KEY ("motoboyVinculadoId") REFERENCES "Motoboy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Permissão de acesso à tela /financeiro (mais restrita que GESTOR normal)
ALTER TABLE "Usuario" ADD COLUMN "podeAcessarFinanceiro" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ConviteEquipe" ADD COLUMN "podeAcessarFinanceiro" BOOLEAN NOT NULL DEFAULT false;

-- Contato que recebe a nota fiscal de serviço em PDF
ALTER TABLE "Cliente" ADD COLUMN "contatoFinanceiroNome" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "contatoFinanceiroEmail" TEXT;

-- Dia em que a semana financeira começa (0=domingo...6=sábado), padrão segunda
ALTER TABLE "Empresa" ADD COLUMN "diaInicioSemanaFinanceira" INTEGER NOT NULL DEFAULT 1;

-- Nota fiscal de serviço semanal por cliente
CREATE TYPE "StatusFatura" AS ENUM ('PENDENTE', 'ENVIADA', 'PAGA');

CREATE TABLE "FaturaCliente" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "periodoInicio" DATE NOT NULL,
    "periodoFim" DATE NOT NULL,
    "valorTotal" DECIMAL(10,2) NOT NULL,
    "totalBandas" INTEGER NOT NULL,
    "status" "StatusFatura" NOT NULL DEFAULT 'PENDENTE',
    "enviadaEm" TIMESTAMP(3),
    "pagaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaturaCliente_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FaturaCliente_clienteId_periodoInicio_periodoFim_key" ON "FaturaCliente"("clienteId", "periodoInicio", "periodoFim");
CREATE INDEX "FaturaCliente_empresaId_status_idx" ON "FaturaCliente"("empresaId", "status");

ALTER TABLE "FaturaCliente" ADD CONSTRAINT "FaturaCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FaturaCliente" ADD CONSTRAINT "FaturaCliente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

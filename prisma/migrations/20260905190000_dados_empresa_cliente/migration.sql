-- Dados da empresa cliente e do responsável operacional
ALTER TABLE "Cliente" ADD COLUMN "cnpj" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "nomeResponsavelOperacional" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "telefoneFixoOperacional" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "telefoneCelularOperacional" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "emailOperacional" TEXT;

-- Responsável financeiro pode ser o mesmo que o operacional
ALTER TABLE "Cliente" ADD COLUMN "financeiroMesmoOperacional" BOOLEAN NOT NULL DEFAULT false;

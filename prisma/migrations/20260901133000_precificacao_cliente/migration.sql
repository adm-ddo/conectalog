-- Empresa: renomeia padrões existentes pro lado "motoboy" e adiciona o
-- lado "cliente" (o que a cooperativa cobra da empresa atendida).
ALTER TABLE "Empresa" RENAME COLUMN "valorBandaPadrao" TO "valorBandaMotoboyPadrao";
ALTER TABLE "Empresa" RENAME COLUMN "valorTaxaExtraPadrao" TO "valorTaxaExtraMotoboyPadrao";
ALTER TABLE "Empresa" ADD COLUMN "valorBandaClientePadrao" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Empresa" ADD COLUMN "valorTaxaExtraClientePadrao" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Cliente: renomeia valores existentes pro lado "motoboy", adiciona lado
-- "cliente", horários/motos fixas por turno, e o modelo de diária/franquia.
ALTER TABLE "Cliente" RENAME COLUMN "valorBanda" TO "valorBandaMotoboy";
ALTER TABLE "Cliente" RENAME COLUMN "valorTaxaExtra" TO "valorTaxaExtraMotoboy";
ALTER TABLE "Cliente" ADD COLUMN "valorBandaCliente" DECIMAL(10,2);
ALTER TABLE "Cliente" ADD COLUMN "valorTaxaExtraCliente" DECIMAL(10,2);
ALTER TABLE "Cliente" ADD COLUMN "turnoManhaAtivo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Cliente" ADD COLUMN "turnoManhaInicio" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "turnoManhaFim" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "motosFixasManha" INTEGER;
ALTER TABLE "Cliente" ADD COLUMN "turnoNoiteAtivo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Cliente" ADD COLUMN "turnoNoiteInicio" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "turnoNoiteFim" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "motosFixasNoite" INTEGER;
ALTER TABLE "Cliente" ADD COLUMN "valorDiariaMotoboy" DECIMAL(10,2);
ALTER TABLE "Cliente" ADD COLUMN "valorDiariaCliente" DECIMAL(10,2);
ALTER TABLE "Cliente" ADD COLUMN "bandasIncluidasNaDiaria" INTEGER;
ALTER TABLE "Cliente" ADD COLUMN "valorBandaExcedenteMotoboy" DECIMAL(10,2);
ALTER TABLE "Cliente" ADD COLUMN "valorBandaExcedenteCliente" DECIMAL(10,2);

-- Turno/Apoio: valor cobrado da empresa cliente, separado do que o
-- motoboy recebe (valorTotal, já existente).
ALTER TABLE "Turno" ADD COLUMN "valorCobradoCliente" DECIMAL(10,2);
ALTER TABLE "Apoio" ADD COLUMN "valorCobradoCliente" DECIMAL(10,2) NOT NULL DEFAULT 0;

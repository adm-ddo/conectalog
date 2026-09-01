-- Taxa extra deixa de ser um valor único e vira uma lista de faixas por
-- Cliente (Taxa 1, Taxa 2, Taxa 3...), cada uma com sua própria descrição
-- e valor (motoboy recebe / cooperativa cobra) — porque cada empresa
-- cliente cobra por faixa de distância de um jeito diferente.

-- CreateTable
CREATE TABLE "ClienteTaxaExtra" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "valorMotoboy" DECIMAL(10,2) NOT NULL,
    "valorCliente" DECIMAL(10,2) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClienteTaxaExtra_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClienteTaxaExtra_clienteId_idx" ON "ClienteTaxaExtra"("clienteId");

ALTER TABLE "ClienteTaxaExtra" ADD CONSTRAINT "ClienteTaxaExtra_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: cada Cliente ganha uma faixa "Taxa 1" com o valor efetivo que
-- estava valendo antes (o próprio do Cliente, senão o padrão da Empresa)
-- — preserva o preço já configurado, só muda a estrutura.
INSERT INTO "ClienteTaxaExtra" ("clienteId", "ordem", "descricao", "valorMotoboy", "valorCliente")
SELECT
    c."id",
    1,
    'Taxa 1',
    COALESCE(c."valorTaxaExtraMotoboy", e."valorTaxaExtraMotoboyPadrao"),
    COALESCE(c."valorTaxaExtraCliente", e."valorTaxaExtraClientePadrao")
FROM "Cliente" c
JOIN "Empresa" e ON e."id" = c."empresaId";

ALTER TABLE "Cliente" DROP COLUMN "valorTaxaExtraMotoboy";
ALTER TABLE "Cliente" DROP COLUMN "valorTaxaExtraCliente";

ALTER TABLE "Empresa" DROP COLUMN "valorTaxaExtraMotoboyPadrao";
ALTER TABLE "Empresa" DROP COLUMN "valorTaxaExtraClientePadrao";

-- CreateTable
CREATE TABLE "TurnoTaxaExtraItem" (
    "id" SERIAL NOT NULL,
    "turnoId" INTEGER NOT NULL,
    "clienteTaxaExtraId" INTEGER,
    "ordem" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "valorMotoboyAplicado" DECIMAL(10,2) NOT NULL,
    "valorClienteAplicado" DECIMAL(10,2) NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 0,
    "quantidadeCliente" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TurnoTaxaExtraItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TurnoTaxaExtraItem_turnoId_idx" ON "TurnoTaxaExtraItem"("turnoId");

ALTER TABLE "TurnoTaxaExtraItem" ADD CONSTRAINT "TurnoTaxaExtraItem_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TurnoTaxaExtraItem" ADD CONSTRAINT "TurnoTaxaExtraItem_clienteTaxaExtraId_fkey" FOREIGN KEY ("clienteTaxaExtraId") REFERENCES "ClienteTaxaExtra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill histórico: turno que já tinha taxa extra (contada ou
-- informada pelo cliente) ganha um item "Taxa 1" pra não sumir da tela de
-- resumo/relatório do motoboy. valorClienteAplicado fica 0 porque o valor
-- cobrado do cliente nunca foi guardado separado por banda/taxa no
-- histórico (só o total em valorCobradoCliente, que continua intacto).
INSERT INTO "TurnoTaxaExtraItem" ("turnoId", "ordem", "descricao", "valorMotoboyAplicado", "valorClienteAplicado", "quantidade", "quantidadeCliente")
SELECT
    t."id",
    1,
    'Taxa 1',
    COALESCE(t."valorTaxaExtraAplicado", 0),
    0,
    t."quantidadeTaxasExtras",
    t."quantidadeTaxasExtrasCliente"
FROM "Turno" t
WHERE t."quantidadeTaxasExtras" > 0 OR t."quantidadeTaxasExtrasCliente" IS NOT NULL;

ALTER TABLE "Turno" DROP COLUMN "valorTaxaExtraAplicado";

-- CreateTable
CREATE TABLE "ApoioTaxaExtraItem" (
    "id" SERIAL NOT NULL,
    "apoioId" INTEGER NOT NULL,
    "clienteTaxaExtraId" INTEGER,
    "ordem" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "valorMotoboyAplicado" DECIMAL(10,2) NOT NULL,
    "valorClienteAplicado" DECIMAL(10,2) NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApoioTaxaExtraItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApoioTaxaExtraItem_apoioId_idx" ON "ApoioTaxaExtraItem"("apoioId");

ALTER TABLE "ApoioTaxaExtraItem" ADD CONSTRAINT "ApoioTaxaExtraItem_apoioId_fkey" FOREIGN KEY ("apoioId") REFERENCES "Apoio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApoioTaxaExtraItem" ADD CONSTRAINT "ApoioTaxaExtraItem_clienteTaxaExtraId_fkey" FOREIGN KEY ("clienteTaxaExtraId") REFERENCES "ClienteTaxaExtra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "ApoioTaxaExtraItem" ("apoioId", "ordem", "descricao", "valorMotoboyAplicado", "valorClienteAplicado", "quantidade")
SELECT
    a."id",
    1,
    'Taxa 1',
    COALESCE(a."valorTaxaExtraAplicado", 0),
    0,
    a."quantidadeTaxasExtras"
FROM "Apoio" a
WHERE a."quantidadeTaxasExtras" > 0;

ALTER TABLE "Apoio" DROP COLUMN "valorTaxaExtraAplicado";

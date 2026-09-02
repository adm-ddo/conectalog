-- Desconto automático por atraso no check-in ("assiduidade") — cada
-- Empresa configura a tolerância (minutos) e o valor descontado por
-- turno (manhã/tarde/noite); cada Motoboy liga ou desliga a regra pra
-- ele.
ALTER TABLE "Empresa" ADD COLUMN "toleranciaAtrasoMinutos" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "Empresa" ADD COLUMN "valorDescontoAtrasoManha" DECIMAL(10,2) NOT NULL DEFAULT 15;
ALTER TABLE "Empresa" ADD COLUMN "valorDescontoAtrasoTarde" DECIMAL(10,2) NOT NULL DEFAULT 10;
ALTER TABLE "Empresa" ADD COLUMN "valorDescontoAtrasoNoite" DECIMAL(10,2) NOT NULL DEFAULT 20;

ALTER TABLE "Motoboy" ADD COLUMN "descontoAssiduidadeAtivo" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "DescontoAssiduidade" (
    "id" SERIAL NOT NULL,
    "turnoId" INTEGER NOT NULL,
    "motoboyId" INTEGER NOT NULL,
    "minutosAtraso" INTEGER NOT NULL,
    "valorDesconto" DECIMAL(10,2) NOT NULL,
    "pagamentoId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DescontoAssiduidade_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DescontoAssiduidade_turnoId_key" ON "DescontoAssiduidade"("turnoId");
CREATE INDEX "DescontoAssiduidade_motoboyId_idx" ON "DescontoAssiduidade"("motoboyId");

ALTER TABLE "DescontoAssiduidade" ADD CONSTRAINT "DescontoAssiduidade_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DescontoAssiduidade" ADD CONSTRAINT "DescontoAssiduidade_motoboyId_fkey" FOREIGN KEY ("motoboyId") REFERENCES "Motoboy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DescontoAssiduidade" ADD CONSTRAINT "DescontoAssiduidade_pagamentoId_fkey" FOREIGN KEY ("pagamentoId") REFERENCES "Pagamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

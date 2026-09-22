-- AlterTable: campo de "retorno" (motoboy voltou pq a expedição errou) —
-- conta pro preço igual a uma banda normal, mas fica separado nos
-- números. Mesmo trio de campos que já existe pra banda: contagem do
-- motoboy, confirmação do cliente, snapshot de divergência.
ALTER TABLE "Turno" ADD COLUMN "quantidadeRetornos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "quantidadeRetornosCliente" INTEGER,
ADD COLUMN "quantidadeRetornosMotoboyOriginal" INTEGER;

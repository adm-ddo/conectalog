-- Cliente pode ter um número de entregas incluídas DIFERENTE do motoboy
-- no modo carência (ex.: cooperativa garante 10 pro motoboy mas só 9 pro
-- cliente) — antes o modo carência reusava o mesmo bandasIncluidas pros
-- dois lados.
ALTER TABLE "ClienteTurnoFixo" ADD COLUMN "bandasIncluidasCliente" INTEGER NOT NULL DEFAULT 0;

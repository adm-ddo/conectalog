-- AlterEnum: novo status pra quando o gestor invalida um turno por
-- suspeita de fraude (motoboy alegou ter trabalhado, cliente nega) — ver
-- comentário em Turno.invalidadoFraudeEm. Precisa ser sua própria
-- migration porque o Postgres não permite ALTER TYPE ... ADD VALUE dentro
-- da mesma transação de outro ALTER TABLE.
ALTER TYPE "StatusTurno" ADD VALUE 'INVALIDADO_FRAUDE';

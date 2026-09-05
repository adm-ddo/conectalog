-- O perfil de valor fixo por turno passa a ser escolhido pelo TURNO que
-- o motoboy representa (manhã/tarde/noite, o mesmo enum de EscalaTurno),
-- não mais comparando o horário de início do turno contra uma janela
-- horaInicio-horaFim configurada aqui — isso causava perfil errado
-- quando duas janelas se sobrepunham (ex.: tarde até 18:00 e noite
-- começando às 15:30/17:00 no mesmo cliente).

ALTER TABLE "ClienteTurnoFixo" ADD COLUMN "turno" "TurnoEscala";

-- Backfill pelos nomes já cadastrados (todos os perfis existentes até
-- agora seguem esse padrão de nome — conferido manualmente antes de
-- rodar isso).
UPDATE "ClienteTurnoFixo" SET "turno" = 'MANHA' WHERE "nome" ILIKE '%manh%';
UPDATE "ClienteTurnoFixo" SET "turno" = 'TARDE' WHERE "nome" ILIKE '%tarde%';
UPDATE "ClienteTurnoFixo" SET "turno" = 'NOITE' WHERE "nome" ILIKE '%noite%' OR "nome" ILIKE '%noit%';

ALTER TABLE "ClienteTurnoFixo" ALTER COLUMN "turno" SET NOT NULL;

ALTER TABLE "ClienteTurnoFixo" DROP COLUMN "horaInicio";
ALTER TABLE "ClienteTurnoFixo" DROP COLUMN "horaFim";

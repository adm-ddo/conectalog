-- Garante no banco (não só na aplicação) que um motoboy nunca tenha mais
-- de um Turno com status ABERTO ao mesmo tempo — a checagem em
-- iniciarTurno (turno/iniciar/actions.ts) sozinha não impede corrida
-- entre requisições concorrentes (foi assim que um bug no botão de
-- assinar deixou 8 turnos abertos duplicados pro mesmo motoboy em menos
-- de um minuto). Índice único parcial: só entra em conflito quando
-- status = 'ABERTO', turnos concluídos/pagos podem se repetir à vontade.
CREATE UNIQUE INDEX "Turno_motoboyId_aberto_unico" ON "Turno" ("motoboyId") WHERE "status" = 'ABERTO';

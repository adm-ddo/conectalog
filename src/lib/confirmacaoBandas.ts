/** Prazo único (2h) que motoboy e cliente têm, cada um do seu lado, pra
 * confirmar a contagem de bandas depois que o turno acaba — motoboy
 * encerrando depois do horário configurado de fim (ver
 * fecharTurnosEsquecidos em lib/fechamento-automatico.ts), cliente
 * confirmando pelo portal depois do horaFim de verdade (ver
 * encerrarPeloCliente em portal/[token]/encerrar/[turnoId]/actions.ts).
 * Os dois usam o MESMO número de propósito (pedido do Thiago) — um só
 * lugar pra não desalinhar se um dia mudar. Passado o prazo sem os dois
 * lados confirmando, vale a contagem de quem confirmou, mas a
 * cooperativa sempre pode corrigir manualmente (ver /turnos/[id]). */
export const PRAZO_CONFIRMACAO_MIN = 120;

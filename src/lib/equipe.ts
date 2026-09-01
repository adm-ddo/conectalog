export type TurnoAtual = "MANHA" | "NOITE" | null;

type HorariosCliente = {
  turnoManhaAtivo: boolean;
  turnoManhaInicio: string | null;
  turnoManhaFim: string | null;
  turnoNoiteAtivo: boolean;
  turnoNoiteInicio: string | null;
  turnoNoiteFim: string | null;
};

function paraMinutos(hhmm: string): number | null {
  const partes = hhmm.split(":").map(Number);
  if (partes.length !== 2 || partes.some(Number.isNaN)) return null;
  return partes[0] * 60 + partes[1];
}

function dentroDaJanela(agora: number, inicio: number, fim: number): boolean {
  // Janela normal (ex: 08:00-14:00) ou cruzando meia-noite (ex: 18:00-02:00).
  return inicio <= fim ? agora >= inicio && agora <= fim : agora >= inicio || agora <= fim;
}

/** Qual turno (manhã/noite) está rolando agora nesse cliente, baseado no
 * horário próprio dele — cada cliente pode ter horários diferentes.
 * Usado pro alerta de "equipe incompleta": só faz sentido comparar
 * contratado x presente durante a janela em que o turno está de fato
 * ativo. */
export function turnoAtivoAgora(cliente: HorariosCliente, agora: Date = new Date()): TurnoAtual {
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();

  if (cliente.turnoManhaAtivo && cliente.turnoManhaInicio && cliente.turnoManhaFim) {
    const inicio = paraMinutos(cliente.turnoManhaInicio);
    const fim = paraMinutos(cliente.turnoManhaFim);
    if (inicio !== null && fim !== null && dentroDaJanela(minutosAgora, inicio, fim)) return "MANHA";
  }
  if (cliente.turnoNoiteAtivo && cliente.turnoNoiteInicio && cliente.turnoNoiteFim) {
    const inicio = paraMinutos(cliente.turnoNoiteInicio);
    const fim = paraMinutos(cliente.turnoNoiteFim);
    if (inicio !== null && fim !== null && dentroDaJanela(minutosAgora, inicio, fim)) return "NOITE";
  }
  return null;
}

export function motosContratadasNoTurno(
  cliente: { motosFixasManha: number | null; motosFixasNoite: number | null },
  turno: TurnoAtual
): number {
  if (turno === "MANHA") return cliente.motosFixasManha ?? 0;
  if (turno === "NOITE") return cliente.motosFixasNoite ?? 0;
  return 0;
}

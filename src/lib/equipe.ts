import { minutosDesdeMeiaNoiteBrasil, diaSemanaBrasil } from "@/lib/data";

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
 * ativo. Sempre calcula no horário de Brasília (nunca no fuso do
 * servidor, que em produção é UTC). */
export function turnoAtivoAgora(cliente: HorariosCliente, agora: Date = new Date()): TurnoAtual {
  const minutosAgora = minutosDesdeMeiaNoiteBrasil(agora);

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

/** Dia da semana (Date.getDay(): 0=domingo...6=sábado, em Brasília) a que
 * o turno pertence "de verdade" — importante pro turno noite que cruza a
 * meia-noite (ex.: sexta 22h-05h): à 1h da madrugada de sábado, o turno
 * ainda é o de sexta-feira, não o de sábado, então a quantidade de moto
 * fixa contratada a comparar é a de sexta. */
function diaSemanaDoTurno(cliente: HorariosCliente, turno: TurnoAtual, agora: Date): number {
  const diaHoje = diaSemanaBrasil(agora);
  if (turno === "NOITE" && cliente.turnoNoiteInicio && cliente.turnoNoiteFim) {
    const inicio = paraMinutos(cliente.turnoNoiteInicio);
    const fim = paraMinutos(cliente.turnoNoiteFim);
    const minutosAgora = minutosDesdeMeiaNoiteBrasil(agora);
    const cruzaMeiaNoite = inicio !== null && fim !== null && inicio > fim;
    if (cruzaMeiaNoite && minutosAgora <= fim!) {
      return (diaHoje + 6) % 7; // dia anterior
    }
  }
  return diaHoje;
}

/** motosFixasManha/Noite: array de 7 posições, índice = Date.getDay()
 * (0=domingo...6=sábado) — cada dia da semana pode ter uma quantidade
 * de moto fixa diferente (ex.: sexta/sábado pedem mais que uma terça). */
export function motosContratadasNoTurno(
  cliente: HorariosCliente & { motosFixasManha: number[]; motosFixasNoite: number[] },
  turno: TurnoAtual,
  agora: Date = new Date()
): number {
  if (turno === null) return 0;
  const diaSemana = diaSemanaDoTurno(cliente, turno, agora);
  if (turno === "MANHA") return cliente.motosFixasManha[diaSemana] ?? 0;
  return cliente.motosFixasNoite[diaSemana] ?? 0;
}

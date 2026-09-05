import { minutosDesdeMeiaNoiteBrasil, diaSemanaBrasil } from "@/lib/data";

export type TurnoAtual = "MANHA" | "TARDE" | "NOITE" | null;

type HorariosCliente = {
  turnoManhaAtivo: boolean;
  turnoManhaInicio: string | null;
  turnoManhaFim: string | null;
  turnoTardeAtivo: boolean;
  turnoTardeInicio: string | null;
  turnoTardeFim: string | null;
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

/** Qual turno (manhã/tarde/noite) está rolando agora nesse cliente,
 * baseado no horário próprio dele — cada cliente pode ter horários
 * diferentes. Usado pro alerta de "equipe incompleta": só faz sentido
 * comparar contratado x presente durante a janela em que o turno está de
 * fato ativo. Sempre calcula no horário de Brasília (nunca no fuso do
 * servidor, que em produção é UTC). */
export function turnoAtivoAgora(cliente: HorariosCliente, agora: Date = new Date()): TurnoAtual {
  const minutosAgora = minutosDesdeMeiaNoiteBrasil(agora);

  if (cliente.turnoManhaAtivo && cliente.turnoManhaInicio && cliente.turnoManhaFim) {
    const inicio = paraMinutos(cliente.turnoManhaInicio);
    const fim = paraMinutos(cliente.turnoManhaFim);
    if (inicio !== null && fim !== null && dentroDaJanela(minutosAgora, inicio, fim)) return "MANHA";
  }
  if (cliente.turnoTardeAtivo && cliente.turnoTardeInicio && cliente.turnoTardeFim) {
    const inicio = paraMinutos(cliente.turnoTardeInicio);
    const fim = paraMinutos(cliente.turnoTardeFim);
    if (inicio !== null && fim !== null && dentroDaJanela(minutosAgora, inicio, fim)) return "TARDE";
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

/** motosFixasManha/Tarde/Noite: array de 7 posições, índice =
 * Date.getDay() (0=domingo...6=sábado) — cada dia da semana pode ter uma
 * quantidade de moto fixa diferente (ex.: sexta/sábado pedem mais que
 * uma terça). */
export function motosContratadasNoTurno(
  cliente: HorariosCliente & {
    motosFixasManha: number[];
    motosFixasTarde: number[];
    motosFixasNoite: number[];
  },
  turno: TurnoAtual,
  agora: Date = new Date()
): number {
  if (turno === null) return 0;
  const diaSemana = diaSemanaDoTurno(cliente, turno, agora);
  if (turno === "MANHA") return cliente.motosFixasManha[diaSemana] ?? 0;
  if (turno === "TARDE") return cliente.motosFixasTarde[diaSemana] ?? 0;
  return cliente.motosFixasNoite[diaSemana] ?? 0;
}

/** Qual turno mostrar quando não tem nenhum rolando agora (turnoAtivoAgora
 * === null): o próximo que vai começar hoje, ou — se já passaram todos —
 * o último configurado. Existe pra telas com UM número por cliente (ex.:
 * quadradinho do dashboard) não terem que escolher entre "somar os 3
 * turnos do dia" (confuso pra cliente com mais de um turno ativo, mistura
 * números de horários diferentes numa conta só) ou "zerar tudo fora da
 * janela" (escondia informação real — foi o que gerava confusão antes:
 * fora do horário, o card mostrava 0 contratadas mesmo já tendo gente
 * escalada pro turno de daqui a pouco). Sempre о turno de UM horário só,
 * nunca a soma. */
export function turnoRelevanteHoje(
  cliente: HorariosCliente,
  agora: Date = new Date()
): TurnoAtual {
  const atual = turnoAtivoAgora(cliente, agora);
  if (atual) return atual;

  const candidatos: { turno: Exclude<TurnoAtual, null>; inicioMin: number }[] = [];
  if (cliente.turnoManhaAtivo && cliente.turnoManhaInicio) {
    const inicio = paraMinutos(cliente.turnoManhaInicio);
    if (inicio !== null) candidatos.push({ turno: "MANHA", inicioMin: inicio });
  }
  if (cliente.turnoTardeAtivo && cliente.turnoTardeInicio) {
    const inicio = paraMinutos(cliente.turnoTardeInicio);
    if (inicio !== null) candidatos.push({ turno: "TARDE", inicioMin: inicio });
  }
  if (cliente.turnoNoiteAtivo && cliente.turnoNoiteInicio) {
    const inicio = paraMinutos(cliente.turnoNoiteInicio);
    if (inicio !== null) candidatos.push({ turno: "NOITE", inicioMin: inicio });
  }
  if (candidatos.length === 0) return null;

  const minutosAgora = minutosDesdeMeiaNoiteBrasil(agora);
  const futuros = candidatos
    .filter((c) => c.inicioMin > minutosAgora)
    .sort((a, b) => a.inicioMin - b.inicioMin);
  if (futuros.length > 0) return futuros[0].turno;

  // Nenhum turno começa mais hoje — mostra o último configurado (o mais
  // recente já rolou e encerrou).
  return candidatos.sort((a, b) => b.inicioMin - a.inicioMin)[0].turno;
}

export const LABEL_TURNO: Record<Exclude<TurnoAtual, null>, string> = {
  MANHA: "manhã",
  TARDE: "tarde",
  NOITE: "noite",
};

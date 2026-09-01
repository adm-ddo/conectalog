// Sem informar o fuso, o Intl.DateTimeFormat e os métodos getHours/getDay
// do Date usam o fuso do servidor — em produção (Vercel) isso é UTC,
// deixando toda data/hora exibida (e toda lógica de "que dia da semana é
// hoje"/"que horas são agora") 3h à frente do horário real de Brasília.
// Fixando o fuso aqui garante o resultado certo não importa onde o
// código rode. Mesmo padrão já usado no extras-app (src/lib/data.ts).
const FUSO_HORARIO_BRASIL = "America/Sao_Paulo";

export function formatarHora(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeStyle: "short",
    timeZone: FUSO_HORARIO_BRASIL,
  }).format(data);
}

export function formatarDataHora(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: FUSO_HORARIO_BRASIL,
  }).format(data);
}

export function formatarData(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: FUSO_HORARIO_BRASIL,
  }).format(data);
}

/** Data (YYYY-MM-DD) do instante, no calendário de Brasília. */
export function dataISOBrasil(instante: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_HORARIO_BRASIL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instante);
}

/** Minutos desde meia-noite (horário de Brasília) do instante — usado pra
 * saber que turno (manhã/noite) está rolando agora. */
export function minutosDesdeMeiaNoiteBrasil(instante: Date = new Date()): number {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO_HORARIO_BRASIL,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instante);
  const hora = Number(partes.find((p) => p.type === "hour")?.value ?? "0");
  const minuto = Number(partes.find((p) => p.type === "minute")?.value ?? "0");
  return hora * 60 + minuto;
}

const DIA_SEMANA_POR_ABREV: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Dia da semana do instante em Brasília, convenção Date.getDay()
 * (0=domingo...6=sábado) — mesmo índice usado em motosFixasManha/Noite. */
export function diaSemanaBrasil(instante: Date = new Date()): number {
  const abrev = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO_HORARIO_BRASIL,
    weekday: "short",
  }).format(instante);
  return DIA_SEMANA_POR_ABREV[abrev];
}

/** Converte uma data (YYYY-MM-DD) mais um horário em minutos desde meia-
 * noite, ambos em horário de Brasília, pro instante UTC correspondente. O
 * Brasil não tem mais horário de verão desde 2019, então São Paulo fica
 * sempre em UTC-3: meia-noite lá é sempre 03:00 UTC do mesmo dia. */
export function instanteBrasil(dataISO: string, minutosDesdeMeiaNoite = 0): Date {
  return new Date(new Date(`${dataISO}T03:00:00.000Z`).getTime() + minutosDesdeMeiaNoite * 60_000);
}

/** Meia-noite de "hoje" (ou do instante dado) em Brasília, como instante
 * UTC — usado pra consultas tipo "turnos iniciados hoje". */
export function inicioDoDiaBrasil(instante: Date = new Date()): Date {
  return instanteBrasil(dataISOBrasil(instante));
}

/** Meia-noite da segunda-feira desta semana em Brasília. */
export function inicioDaSemanaBrasil(instante: Date = new Date()): Date {
  const inicioHoje = inicioDoDiaBrasil(instante);
  const diaSemana = diaSemanaBrasil(instante);
  const diasDesdeSegunda = (diaSemana + 6) % 7;
  return new Date(inicioHoje.getTime() - diasDesdeSegunda * 24 * 60 * 60 * 1000);
}

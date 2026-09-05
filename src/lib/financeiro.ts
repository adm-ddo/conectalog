import "server-only";
import { prisma } from "@/lib/prisma";
import { dataISOBrasil, diaSemanaBrasil, inicioDoDiaBrasil, instanteBrasil } from "@/lib/data";
import { motosContratadasNoTurno } from "@/lib/equipe";
import { encontrarPerfilFixo } from "@/lib/precificacao";
import { paraNumero } from "@/lib/valores";
import type { Cliente, ClienteTurnoFixo } from "@/generated/prisma/client";

/** Segunda-feira (ou o dia configurado em Empresa.diaInicioSemanaFinanceira)
 * da semana que contém `instante`, como data ISO (YYYY-MM-DD) — convenção
 * Date.getDay() (0=domingo...6=sábado), mesma do resto do app. */
export function inicioSemanaFinanceiraISO(
  diaInicioSemana: number,
  instante: Date = new Date()
): string {
  const hojeISO = dataISOBrasil(instante);
  const diaSemanaHoje = diaSemanaBrasil(instante);
  const diasDesdeInicio = (diaSemanaHoje - diaInicioSemana + 7) % 7;
  const [ano, mes, dia] = hojeISO.split("-").map(Number);
  return formatarISO(new Date(ano, mes - 1, dia - diasDesdeInicio));
}

function formatarISO(data: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`;
}

function somarDiasISO(dataISO: string, dias: number): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  return formatarISO(new Date(ano, mes - 1, dia + dias));
}

/** A última semana financeira INTEIRA já fechada (ex.: se hoje é
 * quarta-feira da semana X, retorna segunda a domingo da semana X-1) —
 * padrão pra abrir a tela de gerar/enviar nota fiscal, já que a semana
 * atual ainda está em andamento. */
export function semanaAnteriorCompleta(
  diaInicioSemana: number,
  instante: Date = new Date()
): { inicio: string; fim: string } {
  const inicioAtual = inicioSemanaFinanceiraISO(diaInicioSemana, instante);
  return { inicio: somarDiasISO(inicioAtual, -7), fim: somarDiasISO(inicioAtual, -1) };
}

type ClienteComTurnos = Cliente & { turnosFixos: ClienteTurnoFixo[] };

/** Previsão mínima de hoje pra esse cliente: soma, pra cada turno
 * (manhã/tarde/noite) que ele tem ativo hoje, motos contratadas × valor
 * garantido do perfil de turno fixo que bate com aquele horário — o piso
 * que ele deve gerar mesmo que nenhum motoboy faça uma entrega sequer.
 * Só faz sentido pra cliente no modelo "valor fixo por turno"; cliente
 * "por banda" simples não tem piso nenhum (é puramente por uso), então
 * fica em 0 — a tela mostra isso como "sem piso configurado", não como
 * "vai gerar zero". */
export function previsaoMinimaHojeCliente(cliente: ClienteComTurnos, agora: Date = new Date()): number {
  const hojeISO = dataISOBrasil(agora);
  let total = 0;

  const turnosDoDia: { ativo: boolean; turno: "MANHA" | "TARDE" | "NOITE"; horaInicioConfig: string | null }[] = [
    { ativo: cliente.turnoManhaAtivo, turno: "MANHA", horaInicioConfig: cliente.turnoManhaInicio },
    { ativo: cliente.turnoTardeAtivo, turno: "TARDE", horaInicioConfig: cliente.turnoTardeInicio },
    { ativo: cliente.turnoNoiteAtivo, turno: "NOITE", horaInicioConfig: cliente.turnoNoiteInicio },
  ];

  for (const { ativo, turno, horaInicioConfig } of turnosDoDia) {
    if (!ativo || !horaInicioConfig) continue;
    const contratadas = motosContratadasNoTurno(cliente, turno, agora);
    if (contratadas === 0) continue;

    // Constrói o instante de início desse turno hoje (mesma data, hora
    // configurada) e usa encontrarPerfilFixo de verdade — igual ao
    // cálculo real de um turno (ver src/lib/precificacao.ts) — em vez de
    // só bater o dia da semana, que pegava o primeiro perfil do array
    // mesmo quando não era o perfil daquele horário específico (bug
    // pego na validação: perfil "manhã" sendo usado pra prever a noite).
    const [hora, minuto] = horaInicioConfig.split(":").map(Number);
    const instanteDoTurno = instanteBrasil(hojeISO, hora * 60 + minuto);
    const perfil = encontrarPerfilFixo(cliente.turnosFixos, instanteDoTurno);
    if (!perfil) continue;
    total += contratadas * paraNumero(perfil.valorGarantidoCliente);
  }

  return total;
}

/** Quanto já é valor CONFIRMADO hoje pra esse cliente (turnos/apoios já
 * concluídos, valor real batido) — cresce ao longo do dia conforme os
 * turnos vão fechando, complementando previsaoMinimaHojeCliente (que é
 * só a configuração, fixo o dia inteiro). */
export async function confirmadoHojeCliente(clienteId: number): Promise<number> {
  const inicioHoje = inicioDoDiaBrasil();

  const [turnos, apoios] = await Promise.all([
    prisma.turno.findMany({
      where: { clienteId, horaInicio: { gte: inicioHoje }, status: { in: ["CONCLUIDO", "PAGO"] } },
      select: { valorCobradoCliente: true },
    }),
    prisma.apoio.findMany({
      where: { clienteId, turno: { horaInicio: { gte: inicioHoje } } },
      select: { valorCobradoCliente: true },
    }),
  ]);

  return (
    turnos.reduce((soma, t) => soma + paraNumero(t.valorCobradoCliente), 0) +
    apoios.reduce((soma, a) => soma + paraNumero(a.valorCobradoCliente), 0)
  );
}

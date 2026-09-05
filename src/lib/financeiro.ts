import "server-only";
import { prisma } from "@/lib/prisma";
import { dataISOBrasil, diaSemanaBrasil, inicioDoDiaBrasil } from "@/lib/data";
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

/** Quem recebe a nota fiscal por e-mail — o contato financeiro
 * cadastrado, ou (financeiroMesmoOperacional=true) o responsável
 * operacional, reaproveitando nome/e-mail dele. null se faltar
 * cadastrar o e-mail relevante (a tela de financeiro trava o envio
 * nesse caso). */
export function resolverContatoFinanceiro(
  cliente: Pick<
    Cliente,
    | "financeiroMesmoOperacional"
    | "nomeResponsavelOperacional"
    | "emailOperacional"
    | "contatoFinanceiroNome"
    | "contatoFinanceiroEmail"
  >
): { nome: string; email: string } | null {
  if (cliente.financeiroMesmoOperacional) {
    if (!cliente.emailOperacional) return null;
    return { nome: cliente.nomeResponsavelOperacional || cliente.emailOperacional, email: cliente.emailOperacional };
  }
  if (!cliente.contatoFinanceiroEmail) return null;
  return {
    nome: cliente.contatoFinanceiroNome || cliente.contatoFinanceiroEmail,
    email: cliente.contatoFinanceiroEmail,
  };
}

type ClienteComTurnos = Cliente & { turnosFixos: ClienteTurnoFixo[] };

export type ResumoFinanceiroValores = {
  cliente: number;
  motoboy: number;
  lucro: number;
};

function comLucro(cliente: number, motoboy: number): ResumoFinanceiroValores {
  return { cliente, motoboy, lucro: cliente - motoboy };
}

/** Piso mínimo de hoje pra esse cliente, dos dois lados: soma, pra cada
 * turno (manhã/tarde/noite) que ele tem ativo hoje, motos contratadas ×
 * valor garantido do perfil de turno fixo que bate com aquele turno — o
 * que a cooperativa vai cobrar do cliente e o que ela é OBRIGADA a pagar
 * aos motoboys, mesmo que ninguém faça uma entrega sequer (o garantido
 * do motoboy não depende de banda nenhuma). `lucro` é a diferença — em
 * cliente sem carência (ex.: KERO SUSHI, PRIME PARRILLA: cliente paga
 * por entrega desde a primeira, sem piso por banda, só o fixo da moto
 * parada) o garantido do motoboy costuma ser MAIOR que o fixo cobrado do
 * cliente, então esse "lucro mínimo" nasce negativo de propósito — só
 * fecha no positivo depois que as entregas de verdade acontecem e entram
 * na conta (ver confirmadoHojeCliente). Só faz sentido pro modelo "valor
 * fixo por turno"; cliente "por banda" simples não tem piso nenhum (é
 * puramente por uso), fica em 0 dos dois lados. */
export function previsaoMinimaHojeCliente(
  cliente: ClienteComTurnos,
  agora: Date = new Date()
): ResumoFinanceiroValores {
  const diaSemana = diaSemanaBrasil(agora);
  let totalCliente = 0;
  let totalMotoboy = 0;

  const turnosDoDia: { ativo: boolean; turno: "MANHA" | "TARDE" | "NOITE" }[] = [
    { ativo: cliente.turnoManhaAtivo, turno: "MANHA" },
    { ativo: cliente.turnoTardeAtivo, turno: "TARDE" },
    { ativo: cliente.turnoNoiteAtivo, turno: "NOITE" },
  ];

  for (const { ativo, turno } of turnosDoDia) {
    if (!ativo) continue;
    const contratadas = motosContratadasNoTurno(cliente, turno, agora);
    if (contratadas === 0) continue;

    // O perfil bate pelo TURNO que essas motos representam, não por
    // horário de relógio (ver src/lib/precificacao.ts) — importante pra
    // cliente com perfis de horário sobreposto (ex.: tarde até 18h e
    // noite configurada pra começar às 17h): o turno da noite usa
    // sempre o perfil da noite, mesmo que o horário real de início caia
    // dentro da janela "da tarde".
    const perfil = encontrarPerfilFixo(cliente.turnosFixos, turno, diaSemana);
    if (!perfil) continue;
    totalCliente += contratadas * paraNumero(perfil.valorGarantidoCliente);
    totalMotoboy += contratadas * paraNumero(perfil.valorGarantidoMotoboy);
  }

  return comLucro(totalCliente, totalMotoboy);
}

/** Quanto já é valor CONFIRMADO hoje pra esse cliente (turnos/apoios já
 * concluídos, valor real batido), dos dois lados — cresce ao longo do
 * dia conforme os turnos vão fechando, complementando
 * previsaoMinimaHojeCliente (que é só a configuração, fixo o dia
 * inteiro). `lucro` aqui é o de verdade, não mais o mínimo garantido. */
export async function confirmadoHojeCliente(clienteId: number): Promise<ResumoFinanceiroValores> {
  const inicioHoje = inicioDoDiaBrasil();

  const [turnos, apoios] = await Promise.all([
    prisma.turno.findMany({
      where: { clienteId, horaInicio: { gte: inicioHoje }, status: { in: ["CONCLUIDO", "PAGO"] } },
      select: { valorCobradoCliente: true, valorTotal: true },
    }),
    prisma.apoio.findMany({
      where: { clienteId, turno: { horaInicio: { gte: inicioHoje } } },
      select: { valorCobradoCliente: true, valorTotal: true },
    }),
  ]);

  const totalCliente =
    turnos.reduce((soma, t) => soma + paraNumero(t.valorCobradoCliente), 0) +
    apoios.reduce((soma, a) => soma + paraNumero(a.valorCobradoCliente), 0);
  const totalMotoboy =
    turnos.reduce((soma, t) => soma + paraNumero(t.valorTotal), 0) +
    apoios.reduce((soma, a) => soma + paraNumero(a.valorTotal), 0);

  return comLucro(totalCliente, totalMotoboy);
}

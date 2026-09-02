import { paraNumero, valorEfetivo } from "@/lib/valores";
import { diaSemanaBrasil, minutosDesdeMeiaNoiteBrasil } from "@/lib/data";

/** Um perfil de "valor fixo por turno" (ClienteTurnoFixo) — cobre um
 * horário e um conjunto de dias da semana; fora dessa janela o perfil
 * simplesmente não se aplica. */
export type PerfilTurnoFixo = {
  horaInicio: string;
  horaFim: string;
  diasSemana: number[];
  valorGarantidoMotoboy: unknown;
  valorGarantidoCliente: unknown;
  bandasIncluidas: number;
  valorExcedenteMotoboy: unknown;
  valorExcedenteCliente: unknown;
};

type ClientePreco = {
  valorBandaMotoboy: unknown;
  valorBandaCliente: unknown;
  turnosFixos: PerfilTurnoFixo[];
};

type EmpresaPadrao = {
  valorBandaMotoboyPadrao: unknown;
  valorBandaClientePadrao: unknown;
};

/** Uma faixa de taxa extra com a quantidade batida naquele turno/apoio —
 * usada tanto pra faixa "ao vivo" (ClienteTaxaExtra) quanto pro snapshot
 * já aplicado (TurnoTaxaExtraItem/ApoioTaxaExtraItem), por isso os valores
 * são `unknown` (aceitam Decimal do Prisma ou number). */
export type ItemTaxaExtraCalculo = {
  valorMotoboy: unknown;
  valorCliente: unknown;
  quantidade: number;
};

export type ResultadoCalculo = {
  valorMotoboy: number;
  valorCliente: number;
};

function paraMinutos(hhmm: string): number | null {
  const partes = hhmm.split(":").map(Number);
  if (partes.length !== 2 || partes.some(Number.isNaN)) return null;
  return partes[0] * 60 + partes[1];
}

function dentroDaJanela(agora: number, inicio: number, fim: number): boolean {
  return inicio <= fim ? agora >= inicio && agora <= fim : agora >= inicio || agora <= fim;
}

/** Acha, entre os perfis do Cliente, o primeiro que bate com o dia da
 * semana E o horário de início do turno (ambos em Brasília) — é isso que
 * decide se um turno cai no modelo "valor fixo" (ex.: "Noite — domingo")
 * ou fica de fora e usa "por banda" normal. */
export function encontrarPerfilFixo(
  turnosFixos: PerfilTurnoFixo[],
  inicioTurno: Date
): PerfilTurnoFixo | null {
  const diaSemana = diaSemanaBrasil(inicioTurno);
  const minutos = minutosDesdeMeiaNoiteBrasil(inicioTurno);
  for (const perfil of turnosFixos) {
    if (!perfil.diasSemana.includes(diaSemana)) continue;
    const inicio = paraMinutos(perfil.horaInicio);
    const fim = paraMinutos(perfil.horaFim);
    if (inicio === null || fim === null) continue;
    if (dentroDaJanela(minutos, inicio, fim)) return perfil;
  }
  return null;
}

/** Calcula quanto o motoboy recebe e quanto a cooperativa cobra da
 * empresa cliente por um turno (ou apoio) — dois modelos possíveis por
 * Cliente, nunca misturados no mesmo cálculo:
 *
 * (1) "Por banda" (padrão): bandas × valor da banda, herdando o padrão
 * da Empresa quando o Cliente não tem valor próprio.
 *
 * (2) "Valor fixo por turno" (liga quando o horário de início do turno
 * bate com algum perfil em ClienteTurnoFixo — ver encontrarPerfilFixo):
 * um valor garantido que já cobre N bandas; bandas além disso usam a
 * tarifa de excedente daquele perfil, diferente da tarifa "normal" do
 * item (1). Cada perfil vale só nos dias da semana configurados nele
 * (ex.: um perfil "Noite" pra semana normal e outro só pro domingo, com
 * valores diferentes).
 *
 * Taxas extras somam por cima dos dois modelos, faixa a faixa (cada
 * Cliente tem sua própria lista de faixas — ver ClienteTaxaExtra — não
 * existe mais um valor único nem um padrão de Empresa pra taxa extra).
 */
export function calcularValores(
  cliente: ClientePreco,
  empresa: EmpresaPadrao,
  inicioTurno: Date,
  quantidadeBandas: number,
  taxasExtras: ItemTaxaExtraCalculo[]
): ResultadoCalculo {
  const perfil = encontrarPerfilFixo(cliente.turnosFixos, inicioTurno);

  let valorMotoboy: number;
  let valorCliente: number;

  if (perfil) {
    const excedentes = Math.max(0, quantidadeBandas - perfil.bandasIncluidas);
    valorMotoboy =
      paraNumero(perfil.valorGarantidoMotoboy) + excedentes * paraNumero(perfil.valorExcedenteMotoboy);
    valorCliente =
      paraNumero(perfil.valorGarantidoCliente) + excedentes * paraNumero(perfil.valorExcedenteCliente);
  } else {
    const vbm = valorEfetivo(cliente.valorBandaMotoboy, empresa.valorBandaMotoboyPadrao);
    const vbc = valorEfetivo(cliente.valorBandaCliente, empresa.valorBandaClientePadrao);
    valorMotoboy = quantidadeBandas * vbm;
    valorCliente = quantidadeBandas * vbc;
  }

  for (const item of taxasExtras) {
    valorMotoboy += item.quantidade * paraNumero(item.valorMotoboy);
    valorCliente += item.quantidade * paraNumero(item.valorCliente);
  }

  return { valorMotoboy, valorCliente };
}

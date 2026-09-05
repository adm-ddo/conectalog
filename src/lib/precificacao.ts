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
  carenciaCliente: boolean;
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

export type ConfigRemuneracaoGestor = {
  ehGestor: boolean;
  modoRemuneracaoGestor: "PADRAO" | "VALOR_ESPECIAL" | "NAO_CONTABILIZA";
  valorBandaGestorEspecial: unknown;
};

/** Se quem fechou o turno é Gestor de campo, o valor que ELE recebe pelas
 * próprias bandas (não a cobrança do cliente, que nunca muda) pode seguir
 * uma regra diferente da tarifa normal — ver Motoboy.modoRemuneracaoGestor.
 * Taxas extras nunca entram nessa regra, só a banda, por isso quem chama
 * precisa passar só a parte de banda já separada da parte de taxa extra. */
export function aplicarRemuneracaoGestor(
  valorMotoboyBandas: number,
  quantidadeBandas: number,
  motoboy: ConfigRemuneracaoGestor
): number {
  if (!motoboy.ehGestor || motoboy.modoRemuneracaoGestor === "PADRAO") return valorMotoboyBandas;
  if (motoboy.modoRemuneracaoGestor === "NAO_CONTABILIZA") return 0;
  return quantidadeBandas * paraNumero(motoboy.valorBandaGestorEspecial);
}

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
 * o motoboy sempre recebe com carência — um valor garantido que já cobre
 * N bandas, só as bandas além disso usam a tarifa de excedente. Do lado
 * do cliente, cada perfil escolhe um dos dois modelos (carenciaCliente):
 * por padrão (false) o cliente paga o valor fixo da moto parada MAIS a
 * tarifa por banda sobre TODAS as bandas feitas, desde a primeira, sem
 * carência nenhuma; com carenciaCliente=true ele ganha a mesma carência
 * do motoboy (valorGarantidoCliente já cobre bandasIncluidas, só cobra
 * valorExcedenteCliente nas que passarem disso) — pra clientes que
 * negociarem esse outro modelo. Cada perfil vale só nos dias da semana
 * configurados nele (ex.: um perfil "Noite" pra semana normal e outro só
 * pro domingo, com valores diferentes).
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
    // Sem carência (padrão): cliente paga a moto parada fixa mais a
    // tarifa por banda sobre TODAS as bandas do turno, desde a primeira.
    // Com carência: mesma regra do motoboy, só cobra o que passar de
    // bandasIncluidas.
    const bandasCobradasCliente = perfil.carenciaCliente ? excedentes : quantidadeBandas;
    valorCliente =
      paraNumero(perfil.valorGarantidoCliente) + bandasCobradasCliente * paraNumero(perfil.valorExcedenteCliente);
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

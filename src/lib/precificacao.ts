import { paraNumero, valorEfetivo } from "@/lib/valores";
import { diaSemanaBrasil } from "@/lib/data";
import type { TurnoPredefinido, TurnoEscala } from "@/generated/prisma/enums";

/** Um perfil de "valor fixo por turno" (ClienteTurnoFixo) — cobre um
 * TURNO de verdade (o que o motoboy representa, não o horário em que ele
 * bateu ponto) e um conjunto de dias da semana; fora disso o perfil
 * simplesmente não se aplica. */
export type PerfilTurnoFixo = {
  turno: TurnoEscala;
  diasSemana: number[];
  valorGarantidoMotoboy: unknown;
  valorGarantidoCliente: unknown;
  bandasIncluidas: number;
  valorExcedenteMotoboy: unknown;
  valorExcedenteCliente: unknown;
  carenciaCliente: boolean;
  bandasIncluidasCliente: number;
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

/** Acha, entre os perfis do Cliente, o que bate com o TURNO que o
 * motoboy está representando (o que ele foi escalado pra fazer / marcou
 * no app) e o dia da semana do início do turno (Brasília) — é isso que
 * decide se um turno cai no modelo "valor fixo" (ex.: "Noite — domingo")
 * ou fica de fora e usa "por banda" normal. Turno LIVRE nunca bate com
 * nada aqui (não representa nenhum turno fixo de verdade) — quem chama
 * já filtra isso antes de chegar aqui (ver calcularValores). Decisão
 * confirmada com o Thiago: é o turno que o motoboy representa que
 * importa, não o horário em que ele bateu ponto — motoboy adiantado ou
 * atrasado pro turno da noite continua sendo noite. */
export function encontrarPerfilFixo(
  turnosFixos: PerfilTurnoFixo[],
  turno: TurnoEscala,
  diaSemana: number
): PerfilTurnoFixo | null {
  return turnosFixos.find((p) => p.turno === turno && p.diasSemana.includes(diaSemana)) ?? null;
}

/** Calcula quanto o motoboy recebe e quanto a cooperativa cobra da
 * empresa cliente por um turno (ou apoio) — dois modelos possíveis por
 * Cliente, nunca misturados no mesmo cálculo:
 *
 * (1) "Por banda" (padrão): bandas × valor da banda, herdando o padrão
 * da Empresa quando o Cliente não tem valor próprio.
 *
 * (2) "Valor fixo por turno" (liga quando o TURNO que o motoboy
 * representa bate com algum perfil em ClienteTurnoFixo — ver
 * encontrarPerfilFixo; turno LIVRE nunca liga esse modelo):
 * o motoboy sempre recebe com carência — um valor garantido que já cobre
 * N bandas, só as bandas além disso usam a tarifa de excedente. Do lado
 * do cliente, cada perfil escolhe um dos dois modelos (carenciaCliente):
 * por padrão (false) o cliente paga o valor fixo da moto parada MAIS a
 * tarifa por banda sobre TODAS as bandas feitas, desde a primeira, sem
 * carência nenhuma; com carenciaCliente=true ele ganha uma carência no
 * mesmo espírito da do motoboy, mas com seu PRÓPRIO número de entregas
 * incluídas (bandasIncluidasCliente — pode ser diferente de
 * bandasIncluidas do motoboy: tem cliente em que a cooperativa garante
 * 10 entregas pro motoboy mas só 9 pro cliente): valorGarantidoCliente já
 * cobre bandasIncluidasCliente, só cobra valorExcedenteCliente nas que
 * passarem disso. Cada perfil vale só nos dias da semana configurados
 * nele (ex.: um perfil "Noite" pra semana normal e outro só pro domingo,
 * com valores diferentes).
 *
 * Taxas extras somam por cima dos dois modelos, faixa a faixa (cada
 * Cliente tem sua própria lista de faixas — ver ClienteTaxaExtra — não
 * existe mais um valor único nem um padrão de Empresa pra taxa extra).
 */
export function calcularValores(
  cliente: ClientePreco,
  empresa: EmpresaPadrao,
  inicioTurno: Date,
  turnoPredefinido: TurnoPredefinido,
  quantidadeBandas: number,
  taxasExtras: ItemTaxaExtraCalculo[]
): ResultadoCalculo {
  const perfil =
    turnoPredefinido !== "LIVRE"
      ? encontrarPerfilFixo(cliente.turnosFixos, turnoPredefinido, diaSemanaBrasil(inicioTurno))
      : null;

  let valorMotoboy: number;
  let valorCliente: number;

  if (perfil) {
    const excedentes = Math.max(0, quantidadeBandas - perfil.bandasIncluidas);
    valorMotoboy =
      paraNumero(perfil.valorGarantidoMotoboy) + excedentes * paraNumero(perfil.valorExcedenteMotoboy);
    // Sem carência (padrão): cliente paga a moto parada fixa mais a
    // tarifa por banda sobre TODAS as bandas do turno, desde a primeira.
    // Com carência: mesmo espírito do motoboy, mas com o próprio número
    // de entregas incluídas do cliente (pode ser diferente do motoboy).
    const excedentesCliente = Math.max(0, quantidadeBandas - perfil.bandasIncluidasCliente);
    const bandasCobradasCliente = perfil.carenciaCliente ? excedentesCliente : quantidadeBandas;
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

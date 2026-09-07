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
  /** Total que o motoboy recebe = valorMotoboyBandas + valorMotoboyTaxasExtras. */
  valorMotoboy: number;
  /// Só a parte de banda (garantido+excedente no modelo de valor fixo,
  /// ou bandas × tarifa no modelo por banda) — é o que
  /// aplicarRemuneracaoGestor deve substituir quando o motoboy é Gestor
  /// com regra especial; taxa extra nunca entra nessa substituição.
  valorMotoboyBandas: number;
  /// Taxas extras já líquidas do desconto de déficit (ver calcularValores).
  valorMotoboyTaxasExtras: number;
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
 * existe mais um valor único nem um padrão de Empresa pra taxa extra),
 * MAS só no modelo "valor fixo por turno": se o motoboy não completou as
 * bandasIncluidas do garantido (ex.: fez 9 de 10), a cooperativa já tá
 * cobrindo esse "buraco" pagando o garantido cheio mesmo assim — as
 * taxas extras que ele ganhou nesse turno primeiro tapam esse buraco (ao
 * valor da tarifa de excedente por banda do perfil) e só o que sobrar
 * vira ganho de verdade. Nunca reduz o garantido em si, só o bônus de
 * taxa extra (pode até zerar, nunca fica negativo). Ex.: garantido R$90
 * até 10 entregas (excedente R$8/entrega), motoboy fez 9 entregas sendo
 * 5 na Taxa 1 (R$3 cada = R$15): faltou 1 entrega pro garantido (déficit
 * R$8), então ele recebe R$90 + max(0, 15-8) = R$97. Se ele tivesse
 * batido as 10 entregas (déficit zero), receberia o garantido cheio MAIS
 * os R$15 de taxa extra, sem desconto nenhum. Decisão confirmada com o
 * Thiago. No modelo "por banda" (sem perfil) não existe garantido nem
 * déficit — taxa extra sempre soma inteira. Do lado do CLIENTE a taxa
 * extra nunca sofre esse desconto — ele paga pelo que realmente
 * aconteceu, o desconto é só um acerto interno cooperativa-motoboy.
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

  let valorMotoboyBandas: number;
  let valorCliente: number;
  let deficitMotoboy = 0;

  if (perfil) {
    const excedentes = Math.max(0, quantidadeBandas - perfil.bandasIncluidas);
    const faltantes = Math.max(0, perfil.bandasIncluidas - quantidadeBandas);
    valorMotoboyBandas =
      paraNumero(perfil.valorGarantidoMotoboy) + excedentes * paraNumero(perfil.valorExcedenteMotoboy);
    deficitMotoboy = faltantes * paraNumero(perfil.valorExcedenteMotoboy);
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
    valorMotoboyBandas = quantidadeBandas * vbm;
    valorCliente = quantidadeBandas * vbc;
  }

  let taxaExtraMotoboyBruta = 0;
  for (const item of taxasExtras) {
    taxaExtraMotoboyBruta += item.quantidade * paraNumero(item.valorMotoboy);
    valorCliente += item.quantidade * paraNumero(item.valorCliente);
  }
  const valorMotoboyTaxasExtras = Math.max(0, taxaExtraMotoboyBruta - deficitMotoboy);

  return {
    valorMotoboy: valorMotoboyBandas + valorMotoboyTaxasExtras,
    valorMotoboyBandas,
    valorMotoboyTaxasExtras,
    valorCliente,
  };
}

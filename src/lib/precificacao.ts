import { paraNumero, valorEfetivo } from "@/lib/valores";

type ClientePreco = {
  valorBandaMotoboy: unknown;
  valorBandaCliente: unknown;
  valorDiariaMotoboy: unknown;
  valorDiariaCliente: unknown;
  bandasIncluidasNaDiaria: number | null;
  valorBandaExcedenteMotoboy: unknown;
  valorBandaExcedenteCliente: unknown;
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

/** Calcula quanto o motoboy recebe e quanto a cooperativa cobra da
 * empresa cliente por um turno (ou apoio) — dois modelos possíveis por
 * Cliente, nunca misturados no mesmo cálculo:
 *
 * (1) "Por banda" (padrão, sempre disponível): bandas × valor da banda,
 * herdando o padrão da Empresa quando o Cliente não tem valor próprio.
 *
 * (2) "Diária/franquia" (liga quando o Cliente tem valorDiariaMotoboy
 * configurado): a cooperativa cobra/paga um valor fixo por dia que já
 * cobre N bandas ("bandasIncluidasNaDiaria"); bandas além disso usam uma
 * tarifa de excedente própria, diferente da tarifa "normal" do item (1).
 *
 * Taxas extras somam por cima dos dois modelos, faixa a faixa (cada
 * Cliente tem sua própria lista de faixas — ver ClienteTaxaExtra — não
 * existe mais um valor único nem um padrão de Empresa pra taxa extra).
 */
export function calcularValores(
  cliente: ClientePreco,
  empresa: EmpresaPadrao,
  quantidadeBandas: number,
  taxasExtras: ItemTaxaExtraCalculo[]
): ResultadoCalculo {
  const usaDiaria = cliente.valorDiariaMotoboy != null;

  let valorMotoboy: number;
  let valorCliente: number;

  if (usaDiaria) {
    const incluidas = cliente.bandasIncluidasNaDiaria ?? 0;
    const excedentes = Math.max(0, quantidadeBandas - incluidas);
    valorMotoboy = paraNumero(cliente.valorDiariaMotoboy) + excedentes * paraNumero(cliente.valorBandaExcedenteMotoboy);
    valorCliente = paraNumero(cliente.valorDiariaCliente) + excedentes * paraNumero(cliente.valorBandaExcedenteCliente);
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

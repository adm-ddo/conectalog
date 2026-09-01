import { paraNumero, valorEfetivo } from "@/lib/valores";

type ClientePreco = {
  valorBandaMotoboy: unknown;
  valorBandaCliente: unknown;
  valorTaxaExtraMotoboy: unknown;
  valorTaxaExtraCliente: unknown;
  valorDiariaMotoboy: unknown;
  valorDiariaCliente: unknown;
  bandasIncluidasNaDiaria: number | null;
  valorBandaExcedenteMotoboy: unknown;
  valorBandaExcedenteCliente: unknown;
};

type EmpresaPadrao = {
  valorBandaMotoboyPadrao: unknown;
  valorBandaClientePadrao: unknown;
  valorTaxaExtraMotoboyPadrao: unknown;
  valorTaxaExtraClientePadrao: unknown;
};

export type ResultadoCalculo = {
  valorMotoboy: number;
  valorCliente: number;
};

/** Calcula quanto o motoboy recebe e quanto a cooperativa cobra da
 * empresa cliente por um turno (ou apoio) — dois modelos possíveis por
 * Cliente, nunca misturados no mesmo cálculo:
 *
 * (1) "Por banda" (padrão, sempre disponível): bandas × valor da banda +
 * taxas extras × valor da taxa — cada um com lado motoboy e lado
 * cliente, herdando o padrão da Empresa quando o Cliente não tem valor
 * próprio.
 *
 * (2) "Diária/franquia" (liga quando o Cliente tem valorDiariaMotoboy
 * configurado): a cooperativa cobra/paga um valor fixo por dia que já
 * cobre N bandas ("bandasIncluidasNaDiaria"); bandas além disso usam uma
 * tarifa de excedente própria, diferente da tarifa "normal" do item (1).
 * Taxas extras continuam sempre pelo modelo (1), somadas por cima —
 * não existe "taxa extra" dentro da diária.
 */
export function calcularValores(
  cliente: ClientePreco,
  empresa: EmpresaPadrao,
  quantidadeBandas: number,
  quantidadeTaxasExtras: number
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

  const vtem = valorEfetivo(cliente.valorTaxaExtraMotoboy, empresa.valorTaxaExtraMotoboyPadrao);
  const vtec = valorEfetivo(cliente.valorTaxaExtraCliente, empresa.valorTaxaExtraClientePadrao);
  valorMotoboy += quantidadeTaxasExtras * vtem;
  valorCliente += quantidadeTaxasExtras * vtec;

  return { valorMotoboy, valorCliente };
}

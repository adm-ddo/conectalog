/** Decimal do Prisma chega como objeto Decimal.js — Number() é seguro aqui
 * porque são valores monetários pequenos (banda/taxa), não somas gigantes
 * onde ponto flutuante importaria. */
export function paraNumero(valor: unknown): number {
  return Number(valor ?? 0);
}

export function formatarMoeda(valor: unknown): string {
  return paraNumero(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Valor da banda/taxa extra efetivo pra um Cliente — usa o override do
 * cliente se definido, senão herda o padrão da cooperativa (Empresa). */
export function valorEfetivo(
  valorCliente: unknown,
  valorPadraoEmpresa: unknown
): number {
  return valorCliente == null ? paraNumero(valorPadraoEmpresa) : paraNumero(valorCliente);
}

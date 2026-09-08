/** Mesma regra de src/lib/precificacao.ts (calcularValores), só que
 * pensada pra mostrar a conta em tela em vez de gravar no banco — usada
 * nos formulários de correção de divergência (dashboard e /turnos/[id])
 * pra dar transparência de quanto falta pro garantido daquele turno
 * específico e quanto isso desconta da taxa extra. Ver comentário
 * completo em calcularValores pra entender a regra de negócio. */
export type ContextoGarantido = {
  bandasIncluidas: number;
  valorGarantidoMotoboy: number;
  valorExcedenteMotoboy: number;
};

export function calcularDeficitBandas(
  contexto: ContextoGarantido | null,
  bandas: number
): { deficitBandas: number; deficitValor: number } {
  if (!contexto) return { deficitBandas: 0, deficitValor: 0 };
  const deficitBandas = Math.max(0, contexto.bandasIncluidas - bandas);
  return { deficitBandas, deficitValor: deficitBandas * contexto.valorExcedenteMotoboy };
}

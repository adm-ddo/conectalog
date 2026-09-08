/** Mesma regra de src/lib/precificacao.ts (calcularValores), só que
 * pensada pra mostrar a conta em tela em vez de gravar no banco — usada
 * nos formulários de correção de divergência (dashboard e /turnos/[id])
 * pra dar transparência de quanto o garantido daquele turno específico
 * paga (incluindo excedente, se passou das entregas incluídas) e quanto
 * falta/sobra em relação às taxas extras. Ver comentário completo em
 * calcularValores pra entender a regra de negócio. */
export type ContextoGarantido = {
  bandasIncluidas: number;
  valorGarantidoMotoboy: number;
  valorExcedenteMotoboy: number;
};

export function calcularBandasGarantido(
  contexto: ContextoGarantido | null,
  bandas: number
): { valorMotoboyBandas: number; excedentes: number; deficitBandas: number; deficitValor: number } {
  if (!contexto) return { valorMotoboyBandas: 0, excedentes: 0, deficitBandas: 0, deficitValor: 0 };
  const excedentes = Math.max(0, bandas - contexto.bandasIncluidas);
  const deficitBandas = Math.max(0, contexto.bandasIncluidas - bandas);
  return {
    valorMotoboyBandas: contexto.valorGarantidoMotoboy + excedentes * contexto.valorExcedenteMotoboy,
    excedentes,
    deficitBandas,
    deficitValor: deficitBandas * contexto.valorExcedenteMotoboy,
  };
}

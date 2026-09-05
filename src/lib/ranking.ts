import "server-only";
import { prisma } from "@/lib/prisma";
import { inicioDoDiaBrasil, inicioDaSemanaBrasil } from "@/lib/data";
import type { Prisma } from "@/generated/prisma/client";
import type { TipoEquipamento } from "@/generated/prisma/enums";

export type PeriodoRanking = "hoje" | "semana";

export type LinhaRanking = {
  motoboyId: number;
  nome: string;
  tipoEquipamento: TipoEquipamento | null;
  totalBandas: number;
  horasTrabalhadas: number;
  turnos: number;
};

/** Ranking de motoboys por quantidade de bandas no período (hoje ou
 * semana atual) — critério principal pedido pelo Thiago, com horas
 * trabalhadas como critério de desempate (quem chega cedo e fica até o
 * fim acumula mais tempo, mesmo com o mesmo tanto de bandas). Soma
 * turnos normais + apoios em outros clientes, já que os dois contam como
 * trabalho de verdade no dia. Turno ainda ABERTO conta com o número que
 * o CLIENTE já confirmou pelo portal quando existir (dá pra fechar o
 * lado dele antes do motoboy encerrar — ver comentário em
 * turno/iniciar/actions.ts), senão o que o motoboy já reportou, e as
 * horas contam até agora (turno ainda rolando). */
export async function rankingMotoboys(
  empresaId: number,
  periodo: PeriodoRanking,
  filtroCliente: Prisma.ClienteWhereInput,
  agora: Date = new Date()
): Promise<LinhaRanking[]> {
  const inicio = periodo === "hoje" ? inicioDoDiaBrasil(agora) : inicioDaSemanaBrasil(agora);

  const [turnos, apoios] = await Promise.all([
    prisma.turno.findMany({
      where: {
        horaInicio: { gte: inicio },
        motoboy: { empresaId },
        cliente: filtroCliente,
      },
      select: {
        motoboyId: true,
        horaInicio: true,
        horaFim: true,
        quantidadeBandas: true,
        quantidadeBandasCliente: true,
        motoboy: { select: { nomeCompleto: true, tipoEquipamento: true } },
      },
    }),
    prisma.apoio.findMany({
      where: {
        criadoEm: { gte: inicio },
        turno: { motoboy: { empresaId } },
        cliente: filtroCliente,
      },
      select: {
        quantidadeBandas: true,
        turno: { select: { motoboyId: true, motoboy: { select: { nomeCompleto: true, tipoEquipamento: true } } } },
      },
    }),
  ]);

  const porMotoboy = new Map<
    number,
    { nome: string; tipoEquipamento: TipoEquipamento | null; bandas: number; horas: number; turnos: number }
  >();

  for (const t of turnos) {
    const atual = porMotoboy.get(t.motoboyId) ?? {
      nome: t.motoboy.nomeCompleto,
      tipoEquipamento: t.motoboy.tipoEquipamento,
      bandas: 0,
      horas: 0,
      turnos: 0,
    };
    atual.bandas += t.quantidadeBandasCliente ?? t.quantidadeBandas;
    const fim = t.horaFim ?? agora;
    atual.horas += (fim.getTime() - t.horaInicio.getTime()) / 3_600_000;
    atual.turnos += 1;
    porMotoboy.set(t.motoboyId, atual);
  }

  for (const a of apoios) {
    const atual = porMotoboy.get(a.turno.motoboyId) ?? {
      nome: a.turno.motoboy.nomeCompleto,
      tipoEquipamento: a.turno.motoboy.tipoEquipamento,
      bandas: 0,
      horas: 0,
      turnos: 0,
    };
    atual.bandas += a.quantidadeBandas;
    porMotoboy.set(a.turno.motoboyId, atual);
  }

  return Array.from(porMotoboy.entries())
    .map(([motoboyId, v]) => ({
      motoboyId,
      nome: v.nome,
      tipoEquipamento: v.tipoEquipamento,
      totalBandas: v.bandas,
      horasTrabalhadas: v.horas,
      turnos: v.turnos,
    }))
    .sort((a, b) => b.totalBandas - a.totalBandas || b.horasTrabalhadas - a.horasTrabalhadas);
}

/** "6h30" a partir de horas fracionárias — mesmo espírito de outros
 * formatadores do projeto, só que pra duração, não horário de relógio. */
export function formatarHoras(horas: number): string {
  const totalMinutos = Math.round(horas * 60);
  const h = Math.floor(totalMinutos / 60);
  const m = totalMinutos % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
}

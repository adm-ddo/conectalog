import { prisma } from "@/lib/prisma";
import { inicioDoDiaBrasil } from "@/lib/data";

export type ApoioDoDia = {
  id: number;
  motoboyId: number;
  quantidadeBandas: number;
  motoboyNome: string;
  criadoEm: Date;
};

export type ResumoDiaCliente = {
  totalBandasNormais: number;
  totalBandasApoio: number;
  totalBandas: number;
  apoios: ApoioDoDia[];
};

/** Bandas de hoje pra um Cliente — as normais (dos turnos que começaram
 * hoje, priorizando o número que o CLIENTE confirmou, senão o do
 * motoboy) mais as de apoio (motoboys de outros turnos que vieram
 * ajudar), separadas chamado a chamado. Usado tanto no portal do
 * cliente quanto na tela dele no painel da cooperativa — os dois lados
 * precisam ver a mesma coisa. */
export async function resumoDiaCliente(clienteId: number): Promise<ResumoDiaCliente> {
  const inicioHoje = inicioDoDiaBrasil();

  const [turnos, apoios] = await Promise.all([
    prisma.turno.findMany({
      where: { clienteId, horaInicio: { gte: inicioHoje } },
      select: { quantidadeBandas: true, quantidadeBandasCliente: true },
    }),
    prisma.apoio.findMany({
      where: { clienteId, criadoEm: { gte: inicioHoje } },
      orderBy: { criadoEm: "asc" },
      select: {
        id: true,
        quantidadeBandas: true,
        criadoEm: true,
        turno: { select: { motoboyId: true, motoboy: { select: { nomeCompleto: true } } } },
      },
    }),
  ]);

  const totalBandasNormais = turnos.reduce(
    (soma, t) => soma + (t.quantidadeBandasCliente ?? t.quantidadeBandas),
    0
  );
  const totalBandasApoio = apoios.reduce((soma, a) => soma + a.quantidadeBandas, 0);

  return {
    totalBandasNormais,
    totalBandasApoio,
    totalBandas: totalBandasNormais + totalBandasApoio,
    apoios: apoios.map((a) => ({
      id: a.id,
      motoboyId: a.turno.motoboyId,
      quantidadeBandas: a.quantidadeBandas,
      motoboyNome: a.turno.motoboy.nomeCompleto,
      criadoEm: a.criadoEm,
    })),
  };
}

import "server-only";
import { prisma } from "@/lib/prisma";

/** Apoios AVULSOS (sem turno de base — motoboy livre que rodou de apoio
 * em apoio sem nunca abrir turno em lugar nenhum, ver registrarApoio em
 * turno/apoio/actions.ts) de um motoboy num período. Os apoios que TÊM
 * turno de base continuam vindo junto do turno (turno.apoios) nos
 * lugares que já fazem isso — esse helper é só pra somar os que ficariam
 * de fora dessa leitura aninhada. */
export function apoiosAvulsosDoMotoboy(motoboyId: number, desde: Date, ate: Date) {
  return prisma.apoio.findMany({
    where: { motoboyId, turnoId: null, criadoEm: { gte: desde, lte: ate } },
    orderBy: { criadoEm: "desc" },
    include: { cliente: { select: { nome: true } } },
  });
}

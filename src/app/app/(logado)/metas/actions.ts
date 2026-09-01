"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMotoboy } from "@/lib/auth-motoboy";
import { dataISOBrasil, instanteBrasil } from "@/lib/data";
import type { TipoMeta, PeriodoMeta } from "@/generated/prisma/enums";

export type MetaState = { erro?: string } | undefined;

export type DadosMeta = {
  tipo: TipoMeta;
  valorAlvo: number;
  periodoTipo: PeriodoMeta;
  periodoInicio?: string;
  periodoFim?: string;
};

export async function criarMeta(dados: DadosMeta): Promise<MetaState> {
  const sessao = await requireMotoboy();

  if (!Number.isFinite(dados.valorAlvo) || dados.valorAlvo <= 0) {
    return { erro: "Informe uma meta válida, maior que zero." };
  }

  const hojeISO = dataISOBrasil();
  let periodoInicio = instanteBrasil(hojeISO);
  let periodoFim: Date;

  if (dados.periodoTipo === "PERSONALIZADO") {
    if (!dados.periodoInicio || !dados.periodoFim) {
      return { erro: "Informe o início e o fim do período." };
    }
    periodoInicio = instanteBrasil(dados.periodoInicio);
    periodoFim = instanteBrasil(dados.periodoFim, 23 * 60 + 59);
  } else if (dados.periodoTipo === "DIARIA") {
    periodoFim = instanteBrasil(hojeISO, 23 * 60 + 59);
  } else {
    const dias = dados.periodoTipo === "SEMANAL" ? 7 : 30;
    periodoFim = instanteBrasil(hojeISO, dias * 24 * 60);
  }

  if (periodoFim <= periodoInicio) {
    return { erro: "O fim do período precisa ser depois do início." };
  }

  await prisma.$transaction([
    prisma.meta.updateMany({
      where: { motoboyId: sessao.motoboyId, ativa: true },
      data: { ativa: false },
    }),
    prisma.meta.create({
      data: {
        motoboyId: sessao.motoboyId,
        tipo: dados.tipo,
        valorAlvo: dados.valorAlvo,
        periodoTipo: dados.periodoTipo,
        periodoInicio,
        periodoFim,
      },
    }),
  ]);

  revalidatePath("/metas");
}

export async function encerrarMeta(metaId: number) {
  const sessao = await requireMotoboy();
  await prisma.meta.updateMany({
    where: { id: metaId, motoboyId: sessao.motoboyId },
    data: { ativa: false },
  });
  revalidatePath("/metas");
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMotoboy } from "@/lib/auth-motoboy";
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

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  let periodoInicio = hoje;
  let periodoFim: Date;

  if (dados.periodoTipo === "PERSONALIZADO") {
    if (!dados.periodoInicio || !dados.periodoFim) {
      return { erro: "Informe o início e o fim do período." };
    }
    periodoInicio = new Date(dados.periodoInicio);
    periodoFim = new Date(dados.periodoFim);
  } else {
    const dias = dados.periodoTipo === "SEMANAL" ? 7 : 30;
    periodoFim = new Date(hoje);
    periodoFim.setDate(periodoFim.getDate() + dias);
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

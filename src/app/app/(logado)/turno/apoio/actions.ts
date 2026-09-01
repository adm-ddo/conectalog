"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMotoboy } from "@/lib/auth-motoboy";
import { valorEfetivo } from "@/lib/valores";

export type ApoioState = { erro?: string } | undefined;

export type DadosApoio = {
  clienteId: number;
  quantidadeBandas: number;
  quantidadeTaxasExtras: number;
};

/** Apoio: sem foto/assinatura de propósito (decisão confirmada com o
 * Thiago) — só marca o cliente de apoio e a quantidade, pra não
 * atrapalhar o motoboy no meio da correria. */
export async function registrarApoio(dados: DadosApoio): Promise<ApoioState> {
  const sessao = await requireMotoboy();

  const turnoAberto = await prisma.turno.findFirst({
    where: { motoboyId: sessao.motoboyId, status: "ABERTO" },
  });
  if (!turnoAberto) return { erro: "Você precisa estar em turno pra registrar apoio." };

  const motoboy = await prisma.motoboy.findUniqueOrThrow({
    where: { id: sessao.motoboyId },
    select: { livre: true },
  });
  if (!motoboy.livre) {
    const liberacao = await prisma.motoboyCliente.findUnique({
      where: { motoboyId_clienteId: { motoboyId: sessao.motoboyId, clienteId: dados.clienteId } },
    });
    if (!liberacao?.liberado) {
      return { erro: "Você não está liberado pra dar apoio nesse cliente." };
    }
  }

  const [cliente, empresa] = await Promise.all([
    prisma.cliente.findFirst({ where: { id: dados.clienteId, empresaId: sessao.empresaId, ativo: true } }),
    prisma.empresa.findUniqueOrThrow({ where: { id: sessao.empresaId } }),
  ]);
  if (!cliente) return { erro: "Cliente inválido." };
  if (dados.quantidadeBandas <= 0 && dados.quantidadeTaxasExtras <= 0) {
    return { erro: "Marque ao menos uma banda ou taxa extra." };
  }

  const valorBandaAplicado = valorEfetivo(cliente.valorBanda, empresa.valorBandaPadrao);
  const valorTaxaExtraAplicado = valorEfetivo(cliente.valorTaxaExtra, empresa.valorTaxaExtraPadrao);
  const valorTotal =
    dados.quantidadeBandas * valorBandaAplicado + dados.quantidadeTaxasExtras * valorTaxaExtraAplicado;

  await prisma.apoio.create({
    data: {
      turnoId: turnoAberto.id,
      clienteId: dados.clienteId,
      quantidadeBandas: dados.quantidadeBandas,
      quantidadeTaxasExtras: dados.quantidadeTaxasExtras,
      valorBandaAplicado,
      valorTaxaExtraAplicado,
      valorTotal,
    },
  });

  redirect("/app/inicio");
}

"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMotoboy } from "@/lib/auth-motoboy";
import { uploadDataUrl } from "@/lib/blob";
import { valorEfetivo, paraNumero } from "@/lib/valores";
import { calcularValores } from "@/lib/precificacao";
import type { Prisma } from "@/generated/prisma/client";

export type EncerrarTurnoState = { erro?: string } | undefined;

export type DadosEncerrarTurno = {
  quantidadeBandas: number;
  taxasExtras: { itemId: number; quantidade: number }[];
  fotoFimDataUrl: string;
  assinaturaReciboDataUrl: string;
};

export async function encerrarTurno(dados: DadosEncerrarTurno): Promise<EncerrarTurnoState> {
  const sessao = await requireMotoboy();

  // taxaExtraItens já existe desde o início do turno (um item por faixa
  // do Cliente naquele momento, com o preço já travado) — aqui só marca
  // a quantidade que o motoboy informou em cada um.
  const turno = await prisma.turno.findFirst({
    where: { motoboyId: sessao.motoboyId, status: "ABERTO" },
    include: { cliente: true, taxaExtraItens: true },
  });
  if (!turno) return { erro: "Nenhum turno em aberto." };

  const itensComQuantidade = turno.taxaExtraItens.map((item) => ({
    id: item.id,
    valorMotoboyAplicado: item.valorMotoboyAplicado,
    valorClienteAplicado: item.valorClienteAplicado,
    quantidade: dados.taxasExtras.find((t) => t.itemId === item.id)?.quantidade ?? 0,
  }));
  const totalTaxasExtras = itensComQuantidade.reduce((soma, item) => soma + item.quantidade, 0);

  if (dados.quantidadeBandas <= 0 && totalTaxasExtras <= 0) {
    return { erro: "Marque quantas bandas você fez." };
  }
  if (!dados.fotoFimDataUrl || !dados.assinaturaReciboDataUrl) {
    return { erro: "Falta a foto ou a assinatura do recibo." };
  }

  const empresa = await prisma.empresa.findUniqueOrThrow({ where: { id: sessao.empresaId } });
  const { valorMotoboy, valorCliente } = calcularValores(
    turno.cliente,
    empresa,
    dados.quantidadeBandas,
    itensComQuantidade.map((item) => ({
      valorMotoboy: item.valorMotoboyAplicado,
      valorCliente: item.valorClienteAplicado,
      quantidade: item.quantidade,
    }))
  );
  // Snapshot informativo do valor por banda em vigor — na diária, é a
  // tarifa de excedente (a única que de fato varia com a quantidade).
  const valorBandaAplicado =
    turno.cliente.valorDiariaMotoboy != null
      ? paraNumero(turno.cliente.valorBandaExcedenteMotoboy)
      : valorEfetivo(turno.cliente.valorBandaMotoboy, empresa.valorBandaMotoboyPadrao);

  const [fotoFimUrl, assinaturaReciboUrl] = await Promise.all([
    uploadDataUrl(`turnos/foto-fim-${Date.now()}.jpg`, dados.fotoFimDataUrl),
    uploadDataUrl(`turnos/assinatura-recibo-${Date.now()}.png`, dados.assinaturaReciboDataUrl),
  ]);

  const operacoes: Prisma.PrismaPromise<unknown>[] = [
    prisma.turno.update({
      where: { id: turno.id },
      data: {
        horaFim: new Date(),
        fotoFimUrl,
        assinaturaReciboUrl,
        quantidadeBandas: dados.quantidadeBandas,
        quantidadeTaxasExtras: totalTaxasExtras,
        valorBandaAplicado,
        valorTotal: valorMotoboy,
        valorCobradoCliente: valorCliente,
        status: "CONCLUIDO",
      },
    }),
    ...itensComQuantidade.map((item) =>
      prisma.turnoTaxaExtraItem.update({
        where: { id: item.id },
        data: { quantidade: item.quantidade },
      })
    ),
  ];
  await prisma.$transaction(operacoes);

  redirect(`/app/turno/resumo/${turno.id}`);
}

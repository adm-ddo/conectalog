"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMotoboy } from "@/lib/auth-motoboy";
import { uploadDataUrl } from "@/lib/blob";
import { valorEfetivo } from "@/lib/valores";

export type EncerrarTurnoState = { erro?: string } | undefined;

export type DadosEncerrarTurno = {
  quantidadeBandas: number;
  quantidadeTaxasExtras: number;
  fotoFimDataUrl: string;
  assinaturaReciboDataUrl: string;
};

export async function encerrarTurno(dados: DadosEncerrarTurno): Promise<EncerrarTurnoState> {
  const sessao = await requireMotoboy();

  const turno = await prisma.turno.findFirst({
    where: { motoboyId: sessao.motoboyId, status: "ABERTO" },
    include: { cliente: true },
  });
  if (!turno) return { erro: "Nenhum turno em aberto." };

  if (dados.quantidadeBandas <= 0 && dados.quantidadeTaxasExtras <= 0) {
    return { erro: "Marque quantas bandas você fez." };
  }
  if (!dados.fotoFimDataUrl || !dados.assinaturaReciboDataUrl) {
    return { erro: "Falta a foto ou a assinatura do recibo." };
  }

  const empresa = await prisma.empresa.findUniqueOrThrow({ where: { id: sessao.empresaId } });
  const valorBandaAplicado = valorEfetivo(turno.cliente.valorBanda, empresa.valorBandaPadrao);
  const valorTaxaExtraAplicado = valorEfetivo(
    turno.cliente.valorTaxaExtra,
    empresa.valorTaxaExtraPadrao
  );
  const valorTotal =
    dados.quantidadeBandas * valorBandaAplicado + dados.quantidadeTaxasExtras * valorTaxaExtraAplicado;

  const [fotoFimUrl, assinaturaReciboUrl] = await Promise.all([
    uploadDataUrl(`turnos/foto-fim-${Date.now()}.jpg`, dados.fotoFimDataUrl),
    uploadDataUrl(`turnos/assinatura-recibo-${Date.now()}.png`, dados.assinaturaReciboDataUrl),
  ]);

  await prisma.turno.update({
    where: { id: turno.id },
    data: {
      horaFim: new Date(),
      fotoFimUrl,
      assinaturaReciboUrl,
      quantidadeBandas: dados.quantidadeBandas,
      quantidadeTaxasExtras: dados.quantidadeTaxasExtras,
      valorBandaAplicado,
      valorTaxaExtraAplicado,
      valorTotal,
      status: "CONCLUIDO",
    },
  });

  redirect(`/app/turno/resumo/${turno.id}`);
}

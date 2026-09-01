"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMotoboy } from "@/lib/auth-motoboy";
import { uploadDataUrl } from "@/lib/blob";
import { valorEfetivo, paraNumero } from "@/lib/valores";
import { calcularValores } from "@/lib/precificacao";

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
  const { valorMotoboy, valorCliente } = calcularValores(
    turno.cliente,
    empresa,
    dados.quantidadeBandas,
    dados.quantidadeTaxasExtras
  );
  // Snapshot informativo do valor por banda em vigor — na diária, é a
  // tarifa de excedente (a única que de fato varia com a quantidade).
  const valorBandaAplicado =
    turno.cliente.valorDiariaMotoboy != null
      ? paraNumero(turno.cliente.valorBandaExcedenteMotoboy)
      : valorEfetivo(turno.cliente.valorBandaMotoboy, empresa.valorBandaMotoboyPadrao);
  const valorTaxaExtraAplicado = valorEfetivo(
    turno.cliente.valorTaxaExtraMotoboy,
    empresa.valorTaxaExtraMotoboyPadrao
  );

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
      valorTotal: valorMotoboy,
      valorCobradoCliente: valorCliente,
      status: "CONCLUIDO",
    },
  });

  redirect(`/app/turno/resumo/${turno.id}`);
}

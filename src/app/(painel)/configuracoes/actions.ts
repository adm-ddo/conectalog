"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/auth-empresa";
import { uploadDataUrlPublico } from "@/lib/blob";

export type ConfigState = { erro?: string } | undefined;

export async function atualizarLogo(
  _prev: ConfigState,
  formData: FormData
): Promise<ConfigState> {
  const sessao = await requireMaster();
  const dataUrl = String(formData.get("logoDataUrl") ?? "");
  if (!dataUrl.startsWith("data:image/")) {
    return { erro: "Escolha uma imagem válida." };
  }

  const logoUrl = await uploadDataUrlPublico(
    `empresas/${sessao.empresaId}/logo-${Date.now()}.png`,
    dataUrl
  );
  await prisma.empresa.update({ where: { id: sessao.empresaId }, data: { logoUrl } });

  revalidatePath("/configuracoes");
}

function decimal(formData: FormData, campo: string): number | null {
  const texto = String(formData.get(campo) ?? "").trim();
  if (!texto) return null;
  const numero = Number(texto);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

export async function atualizarValoresPadrao(
  _prev: ConfigState,
  formData: FormData
): Promise<ConfigState> {
  const sessao = await requireMaster();

  const valorBandaMotoboyPadrao = decimal(formData, "valorBandaMotoboyPadrao");
  const valorBandaClientePadrao = decimal(formData, "valorBandaClientePadrao");
  const valorTaxaExtraMotoboyPadrao = decimal(formData, "valorTaxaExtraMotoboyPadrao");
  const valorTaxaExtraClientePadrao = decimal(formData, "valorTaxaExtraClientePadrao");

  if (
    valorBandaMotoboyPadrao === null ||
    valorBandaClientePadrao === null ||
    valorTaxaExtraMotoboyPadrao === null ||
    valorTaxaExtraClientePadrao === null
  ) {
    return { erro: "Preencha todos os valores com números válidos." };
  }

  await prisma.empresa.update({
    where: { id: sessao.empresaId },
    data: {
      valorBandaMotoboyPadrao,
      valorBandaClientePadrao,
      valorTaxaExtraMotoboyPadrao,
      valorTaxaExtraClientePadrao,
    },
  });

  revalidatePath("/configuracoes");
}

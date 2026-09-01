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

export async function atualizarValoresPadrao(
  _prev: ConfigState,
  formData: FormData
): Promise<ConfigState> {
  const sessao = await requireMaster();
  const valorBandaPadrao = Number(String(formData.get("valorBandaPadrao") ?? "0").replace(",", "."));
  const valorTaxaExtraPadrao = Number(
    String(formData.get("valorTaxaExtraPadrao") ?? "0").replace(",", ".")
  );

  if (!Number.isFinite(valorBandaPadrao) || valorBandaPadrao < 0) {
    return { erro: "Valor da banda inválido." };
  }
  if (!Number.isFinite(valorTaxaExtraPadrao) || valorTaxaExtraPadrao < 0) {
    return { erro: "Valor da taxa extra inválido." };
  }

  await prisma.empresa.update({
    where: { id: sessao.empresaId },
    data: { valorBandaPadrao, valorTaxaExtraPadrao },
  });

  revalidatePath("/configuracoes");
}

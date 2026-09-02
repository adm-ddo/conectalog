"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/auth-empresa";

export type ConfigState = { erro?: string } | undefined;

// Logo fica guardado direto como data URL na coluna (texto sem limite no
// Postgres) — o Blob Store desse projeto está configurado como privado, e
// blob privado não dá pra abrir direto num <img src>. Diferente de foto/
// assinatura de pessoa (que fica no Blob), logo não precisa do storage
// separado. O LogoForm tenta redimensionar no navegador antes de enviar,
// mas isso é best-effort (cai pro arquivo original se o navegador não
// conseguir processar) — por isso o limite aqui cobre o caso de vir sem
// redimensionar (arquivo original de até 4MB, ~5,3MB já em base64).
const TAMANHO_MAXIMO_BYTES = 6 * 1024 * 1024;

export async function atualizarLogo(
  _prev: ConfigState,
  formData: FormData
): Promise<ConfigState> {
  const sessao = await requireMaster();
  const dataUrl = String(formData.get("logoDataUrl") ?? "");
  if (!dataUrl.startsWith("data:image/")) {
    return { erro: "Escolha uma imagem válida." };
  }
  if (dataUrl.length > TAMANHO_MAXIMO_BYTES) {
    return { erro: "Essa imagem é grande demais — tente uma logo mais simples ou menor." };
  }

  await prisma.empresa.update({ where: { id: sessao.empresaEfetivoId }, data: { logoUrl: dataUrl } });

  revalidatePath("/configuracoes");
  revalidatePath("/app", "layout");
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

  if (valorBandaMotoboyPadrao === null || valorBandaClientePadrao === null) {
    return { erro: "Preencha todos os valores com números válidos." };
  }

  await prisma.empresa.update({
    where: { id: sessao.empresaEfetivoId },
    data: { valorBandaMotoboyPadrao, valorBandaClientePadrao },
  });

  revalidatePath("/configuracoes");
}

export async function atualizarConfigAssiduidade(
  _prev: ConfigState,
  formData: FormData
): Promise<ConfigState> {
  const sessao = await requireMaster();

  const toleranciaTexto = String(formData.get("toleranciaAtrasoMinutos") ?? "").trim();
  const tolerancia = Number(toleranciaTexto);
  const valorManha = decimal(formData, "valorDescontoAtrasoManha");
  const valorTarde = decimal(formData, "valorDescontoAtrasoTarde");
  const valorNoite = decimal(formData, "valorDescontoAtrasoNoite");

  if (
    !Number.isInteger(tolerancia) ||
    tolerancia < 0 ||
    valorManha === null ||
    valorTarde === null ||
    valorNoite === null
  ) {
    return { erro: "Preencha todos os valores com números válidos." };
  }

  await prisma.empresa.update({
    where: { id: sessao.empresaEfetivoId },
    data: {
      toleranciaAtrasoMinutos: tolerancia,
      valorDescontoAtrasoManha: valorManha,
      valorDescontoAtrasoTarde: valorTarde,
      valorDescontoAtrasoNoite: valorNoite,
    },
  });

  revalidatePath("/configuracoes");
}

export async function regenerarTokenCadastroMotoboy() {
  const sessao = await requireMaster();
  await prisma.empresa.update({
    where: { id: sessao.empresaEfetivoId },
    data: { tokenCadastroMotoboy: randomBytes(16).toString("hex") },
  });
  revalidatePath("/configuracoes");
}

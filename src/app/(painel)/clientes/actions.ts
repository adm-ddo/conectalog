"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/auth-empresa";

export type ClienteFormState = { erro?: string } | undefined;

function decimalOpcional(formData: FormData, campo: string): number | null {
  const texto = String(formData.get(campo) ?? "").trim();
  if (!texto) return null;
  const numero = Number(texto);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

function intOpcional(formData: FormData, campo: string): number | null {
  const texto = String(formData.get(campo) ?? "").trim();
  if (!texto) return null;
  const numero = Number(texto);
  return Number.isInteger(numero) && numero >= 0 ? numero : null;
}

function textoOpcional(formData: FormData, campo: string): string | null {
  return String(formData.get(campo) ?? "").trim() || null;
}

/** Monta os campos de preço/horário/diária comuns a criar e atualizar —
 * a diária só entra se "usarDiaria" veio marcado no form (senão os
 * campos ficam null, caindo no modelo "por banda" normal). */
function dadosComuns(formData: FormData) {
  const usarDiaria = formData.get("usarDiaria") === "on";

  return {
    endereco: textoOpcional(formData, "endereco"),

    turnoManhaAtivo: formData.get("turnoManhaAtivo") === "on",
    turnoManhaInicio: textoOpcional(formData, "turnoManhaInicio"),
    turnoManhaFim: textoOpcional(formData, "turnoManhaFim"),
    motosFixasManha: intOpcional(formData, "motosFixasManha"),

    turnoNoiteAtivo: formData.get("turnoNoiteAtivo") === "on",
    turnoNoiteInicio: textoOpcional(formData, "turnoNoiteInicio"),
    turnoNoiteFim: textoOpcional(formData, "turnoNoiteFim"),
    motosFixasNoite: intOpcional(formData, "motosFixasNoite"),

    valorBandaMotoboy: decimalOpcional(formData, "valorBandaMotoboy"),
    valorBandaCliente: decimalOpcional(formData, "valorBandaCliente"),
    valorTaxaExtraMotoboy: decimalOpcional(formData, "valorTaxaExtraMotoboy"),
    valorTaxaExtraCliente: decimalOpcional(formData, "valorTaxaExtraCliente"),

    valorDiariaMotoboy: usarDiaria ? decimalOpcional(formData, "valorDiariaMotoboy") : null,
    valorDiariaCliente: usarDiaria ? decimalOpcional(formData, "valorDiariaCliente") : null,
    bandasIncluidasNaDiaria: usarDiaria ? intOpcional(formData, "bandasIncluidasNaDiaria") : null,
    valorBandaExcedenteMotoboy: usarDiaria
      ? decimalOpcional(formData, "valorBandaExcedenteMotoboy")
      : null,
    valorBandaExcedenteCliente: usarDiaria
      ? decimalOpcional(formData, "valorBandaExcedenteCliente")
      : null,
  };
}

export async function criarCliente(
  _prev: ClienteFormState,
  formData: FormData
): Promise<ClienteFormState> {
  const sessao = await requireEmpresa();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { erro: "Informe o nome do cliente." };

  await prisma.cliente.create({
    data: { empresaId: sessao.empresaId, nome, ...dadosComuns(formData) },
  });

  revalidatePath("/clientes");
}

export async function atualizarCliente(
  clienteId: number,
  _prev: ClienteFormState,
  formData: FormData
): Promise<ClienteFormState> {
  const sessao = await requireEmpresa();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { erro: "Informe o nome do cliente." };

  await prisma.cliente.updateMany({
    where: { id: clienteId, empresaId: sessao.empresaId },
    data: { nome, ...dadosComuns(formData) },
  });

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clienteId}`);
}

export async function alternarAtivoCliente(clienteId: number, ativo: boolean) {
  const sessao = await requireEmpresa();
  await prisma.cliente.updateMany({
    where: { id: clienteId, empresaId: sessao.empresaId },
    data: { ativo },
  });
  revalidatePath("/clientes");
}

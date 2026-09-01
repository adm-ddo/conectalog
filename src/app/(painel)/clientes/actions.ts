"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/auth-empresa";

export type ClienteFormState = { erro?: string } | undefined;

function parseDecimalOpcional(valor: FormDataEntryValue | null): number | null {
  const texto = String(valor ?? "").trim().replace(",", ".");
  if (!texto) return null;
  const numero = Number(texto);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

export async function criarCliente(
  _prev: ClienteFormState,
  formData: FormData
): Promise<ClienteFormState> {
  const sessao = await requireEmpresa();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { erro: "Informe o nome do cliente." };

  await prisma.cliente.create({
    data: {
      empresaId: sessao.empresaId,
      nome,
      endereco: String(formData.get("endereco") ?? "").trim() || null,
      valorBanda: parseDecimalOpcional(formData.get("valorBanda")),
      valorTaxaExtra: parseDecimalOpcional(formData.get("valorTaxaExtra")),
    },
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
    data: {
      nome,
      endereco: String(formData.get("endereco") ?? "").trim() || null,
      valorBanda: parseDecimalOpcional(formData.get("valorBanda")),
      valorTaxaExtra: parseDecimalOpcional(formData.get("valorTaxaExtra")),
    },
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

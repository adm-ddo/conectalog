"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmpresa } from "@/lib/auth-empresa";

export type MotoboyFormState = { erro?: string } | undefined;

const TIPOS_CHAVE_PIX = ["CPF", "CNPJ", "EMAIL", "TELEFONE", "ALEATORIA"] as const;
const TIPOS_EQUIPAMENTO = ["BAG", "BAU_PEQUENO", "BAU_MEDIO", "BAU_GRANDE"] as const;

/** Criação manual pela cooperativa — o motoboy ainda não tem senha; ele
 * reivindica o acesso depois em /app/cadastrar-acesso (CPF + e-mail
 * batendo com o que o admin cadastrou aqui), mesmo espírito do
 * /portal/cadastrar-acesso do extras-app. */
export async function criarMotoboyManual(
  _prev: MotoboyFormState,
  formData: FormData
): Promise<MotoboyFormState> {
  const sessao = await requireEmpresa();

  const nomeCompleto = String(formData.get("nomeCompleto") ?? "").trim();
  const cpf = String(formData.get("cpf") ?? "").replace(/\D/g, "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const dataNascimento = String(formData.get("dataNascimento") ?? "");
  const endereco = String(formData.get("endereco") ?? "").trim();
  const telefoneCelular = String(formData.get("telefoneCelular") ?? "").trim();
  const telefoneEmergencia = String(formData.get("telefoneEmergencia") ?? "").trim();
  const chavePix = String(formData.get("chavePix") ?? "").trim();
  const tipoChavePix = String(formData.get("tipoChavePix") ?? "");
  const tipoEquipamentoTexto = String(formData.get("tipoEquipamento") ?? "");
  const tipoEquipamento = TIPOS_EQUIPAMENTO.includes(
    tipoEquipamentoTexto as (typeof TIPOS_EQUIPAMENTO)[number]
  )
    ? (tipoEquipamentoTexto as (typeof TIPOS_EQUIPAMENTO)[number])
    : null;

  if (!nomeCompleto || !cpf || !email || !dataNascimento || !endereco) {
    return { erro: "Preencha nome, CPF, e-mail, data de nascimento e endereço." };
  }
  if (!telefoneCelular || !telefoneEmergencia) {
    return { erro: "Preencha o celular e o telefone de emergência." };
  }
  if (!chavePix || !TIPOS_CHAVE_PIX.includes(tipoChavePix as (typeof TIPOS_CHAVE_PIX)[number])) {
    return { erro: "Preencha a chave PIX e o tipo dela." };
  }

  const jaExiste = await prisma.motoboy.findFirst({ where: { OR: [{ cpf }, { email }] } });
  if (jaExiste) {
    return { erro: "Já existe um motoboy cadastrado com esse CPF ou e-mail." };
  }

  await prisma.motoboy.create({
    data: {
      empresaId: sessao.empresaId,
      nomeCompleto,
      cpf,
      email,
      dataNascimento: new Date(dataNascimento),
      endereco,
      telefoneCelular,
      telefoneEmergencia,
      chavePix,
      tipoChavePix: tipoChavePix as (typeof TIPOS_CHAVE_PIX)[number],
      tipoEquipamento,
    },
  });

  revalidatePath("/motoboys");
}

export async function atualizarEquipamentoMotoboy(
  motoboyId: number,
  tipoEquipamento: (typeof TIPOS_EQUIPAMENTO)[number] | null
) {
  const sessao = await requireEmpresa();
  await prisma.motoboy.updateMany({
    where: { id: motoboyId, empresaId: sessao.empresaId },
    data: { tipoEquipamento },
  });
  revalidatePath(`/motoboys/${motoboyId}`);
  revalidatePath("/motoboys");
}

export async function alternarAtivoMotoboy(motoboyId: number, ativo: boolean) {
  const sessao = await requireEmpresa();
  await prisma.motoboy.updateMany({
    where: { id: motoboyId, empresaId: sessao.empresaId },
    data: { ativo },
  });
  revalidatePath("/motoboys");
}

export async function alternarLivreMotoboy(motoboyId: number, livre: boolean) {
  const sessao = await requireEmpresa();
  await prisma.motoboy.updateMany({
    where: { id: motoboyId, empresaId: sessao.empresaId },
    data: { livre },
  });
  revalidatePath(`/motoboys/${motoboyId}`);
}

/** Liga/desliga a autorização de um motoboy pra um cliente específico —
 * decisão confirmada com o Thiago: aqui é sempre explícito, nunca
 * automático (diferente do vínculo aberto do extras-app). */
export async function alternarLiberacaoMotoboyCliente(
  motoboyId: number,
  clienteId: number,
  liberado: boolean
) {
  const sessao = await requireEmpresa();

  // Confere posse dos dois lados antes de mexer — motoboy e cliente
  // precisam ser da mesma empresa de quem está logado.
  const [motoboy, cliente] = await Promise.all([
    prisma.motoboy.findFirst({ where: { id: motoboyId, empresaId: sessao.empresaId } }),
    prisma.cliente.findFirst({ where: { id: clienteId, empresaId: sessao.empresaId } }),
  ]);
  if (!motoboy || !cliente) return;

  await prisma.motoboyCliente.upsert({
    where: { motoboyId_clienteId: { motoboyId, clienteId } },
    update: { liberado },
    create: { motoboyId, clienteId, liberado },
  });

  revalidatePath(`/motoboys/${motoboyId}`);
  revalidatePath(`/clientes/${clienteId}`);
}

export type ValeFormState = { erro?: string } | undefined;

/** Registra um vale (adiantamento) — aparece pro motoboy no app dele.
 * Não desconta automaticamente de nenhum pagamento; é a cooperativa que
 * marca como descontado quando de fato compensar na hora do PIX. */
export async function criarVale(
  motoboyId: number,
  _prev: ValeFormState,
  formData: FormData
): Promise<ValeFormState> {
  const sessao = await requireEmpresa();

  const valor = Number(String(formData.get("valor") ?? "").replace(",", "."));
  const observacao = String(formData.get("observacao") ?? "").trim() || null;

  if (!Number.isFinite(valor) || valor <= 0) {
    return { erro: "Informe um valor válido." };
  }

  const motoboy = await prisma.motoboy.findFirst({
    where: { id: motoboyId, empresaId: sessao.empresaId },
  });
  if (!motoboy) return { erro: "Motoboy inválido." };

  await prisma.vale.create({
    data: {
      motoboyId,
      empresaId: sessao.empresaId,
      valor,
      observacao,
      criadoPorUsuarioId: sessao.usuarioId,
    },
  });

  revalidatePath(`/motoboys/${motoboyId}`);
}

export async function marcarValeDescontado(valeId: number, motoboyId: number) {
  const sessao = await requireEmpresa();
  await prisma.vale.updateMany({
    where: { id: valeId, empresaId: sessao.empresaId },
    data: { descontadoEm: new Date() },
  });
  revalidatePath(`/motoboys/${motoboyId}`);
}

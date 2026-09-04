"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth-empresa";

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
  const sessao = await requireTenant();

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
      empresaId: sessao.empresaEfetivoId,
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
      // Cadastro manual pela própria cooperativa já é aprovação implícita
      // — diferente de quem "pede vaga" sozinho pelo app.
      aprovadoEm: new Date(),
    },
  });

  revalidatePath("/motoboys");
}

export async function atualizarEquipamentoMotoboy(
  motoboyId: number,
  tipoEquipamento: (typeof TIPOS_EQUIPAMENTO)[number] | null
) {
  const sessao = await requireTenant();
  await prisma.motoboy.updateMany({
    where: { id: motoboyId, empresaId: sessao.empresaEfetivoId },
    data: { tipoEquipamento },
  });
  revalidatePath(`/motoboys/${motoboyId}`);
  revalidatePath("/motoboys");
}

export async function alternarAtivoMotoboy(motoboyId: number, ativo: boolean) {
  const sessao = await requireTenant();
  await prisma.motoboy.updateMany({
    where: { id: motoboyId, empresaId: sessao.empresaEfetivoId },
    data: { ativo },
  });
  revalidatePath("/motoboys");
}

export type ExcluirMotoboyResult = { erro?: string } | undefined;

/** Exclusão de verdade (não é o mesmo que bloquear/alternarAtivoMotoboy) —
 * só permitida quando o motoboy nunca trabalhou de fato, porque todo
 * relacionamento dele (turnos, pagamentos, vales...) é onDelete: Cascade
 * no schema. Excluir alguém com histórico apagaria pagamento e turno de
 * verdade — nesse caso a cooperativa deve bloquear em vez de excluir. */
export async function excluirMotoboy(motoboyId: number): Promise<ExcluirMotoboyResult> {
  const sessao = await requireTenant();

  const motoboy = await prisma.motoboy.findFirst({
    where: { id: motoboyId, empresaId: sessao.empresaEfetivoId },
    select: {
      _count: {
        select: {
          turnos: true,
          pagamentos: true,
          vales: true,
          avaliacoes: true,
          ocorrencias: true,
          descontosAssiduidade: true,
        },
      },
    },
  });
  if (!motoboy) return { erro: "Motoboy não encontrado." };

  const temHistorico = Object.values(motoboy._count).some((n) => n > 0);
  if (temHistorico) {
    return {
      erro:
        "Esse motoboy já tem turnos, pagamentos ou outros registros — excluir apagaria esse histórico. Bloqueie em vez de excluir.",
    };
  }

  await prisma.motoboy.delete({ where: { id: motoboyId } });
  revalidatePath("/motoboys");
}

/** Aprova quem pediu vaga sozinho pelo app (ver solicitarVagaMotoboy) —
 * a partir daqui ele já consegue logar (contanto que também tenha
 * confirmado o e-mail). Não mexe em `livre`: a cooperativa ainda precisa
 * liberar explicitamente em quais clientes ele pode trabalhar, igual
 * qualquer motoboy cadastrado manualmente. */
export async function aprovarSolicitacaoMotoboy(motoboyId: number) {
  const sessao = await requireTenant();
  await prisma.motoboy.updateMany({
    where: { id: motoboyId, empresaId: sessao.empresaEfetivoId, aprovadoEm: null },
    data: { aprovadoEm: new Date() },
  });
  revalidatePath("/motoboys");
}

/** Recusa uma solicitação de vaga — não apaga o cadastro (é um perfil de
 * verdade, com login próprio), só devolve ele "pra prateleira"
 * (empresaId null), disponível de novo pra qualquer cooperativa chamar
 * ou pra ele pedir vaga em outra. */
export async function rejeitarSolicitacaoMotoboy(motoboyId: number) {
  const sessao = await requireTenant();
  await prisma.motoboy.updateMany({
    where: { id: motoboyId, empresaId: sessao.empresaEfetivoId, aprovadoEm: null },
    data: { empresaId: null, aprovadoEm: null, livre: false },
  });
  revalidatePath("/motoboys");
}

export async function alternarLivreMotoboy(motoboyId: number, livre: boolean) {
  const sessao = await requireTenant();
  await prisma.motoboy.updateMany({
    where: { id: motoboyId, empresaId: sessao.empresaEfetivoId },
    data: { livre },
  });
  revalidatePath(`/motoboys/${motoboyId}`);
}

/** Liga/desliga o desconto automático de atraso pra esse motoboy (ver
 * Empresa.toleranciaAtrasoMinutos e DescontoAssiduidade). */
export async function alternarDescontoAssiduidade(motoboyId: number, ativo: boolean) {
  const sessao = await requireTenant();
  await prisma.motoboy.updateMany({
    where: { id: motoboyId, empresaId: sessao.empresaEfetivoId },
    data: { descontoAssiduidadeAtivo: ativo },
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
  const sessao = await requireTenant();

  // Confere posse dos dois lados antes de mexer — motoboy e cliente
  // precisam ser da mesma empresa de quem está logado.
  const [motoboy, cliente] = await Promise.all([
    prisma.motoboy.findFirst({ where: { id: motoboyId, empresaId: sessao.empresaEfetivoId } }),
    prisma.cliente.findFirst({ where: { id: clienteId, empresaId: sessao.empresaEfetivoId } }),
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
  const sessao = await requireTenant();

  const valor = Number(String(formData.get("valor") ?? "").replace(",", "."));
  const dataTexto = String(formData.get("data") ?? "").trim();
  const observacao = String(formData.get("observacao") ?? "").trim() || null;

  if (!Number.isFinite(valor) || valor <= 0) {
    return { erro: "Informe um valor válido." };
  }
  if (!dataTexto) {
    return { erro: "Informe a data do vale." };
  }

  const motoboy = await prisma.motoboy.findFirst({
    where: { id: motoboyId, empresaId: sessao.empresaEfetivoId },
  });
  if (!motoboy) return { erro: "Motoboy inválido." };

  await prisma.vale.create({
    data: {
      motoboyId,
      empresaId: sessao.empresaEfetivoId,
      valor,
      data: new Date(dataTexto),
      observacao,
      criadoPorUsuarioId: sessao.usuarioId,
    },
  });

  revalidatePath(`/motoboys/${motoboyId}`);
}

export async function marcarValeDescontado(valeId: number, motoboyId: number) {
  const sessao = await requireTenant();
  await prisma.vale.updateMany({
    where: { id: valeId, empresaId: sessao.empresaEfetivoId },
    data: { descontadoEm: new Date() },
  });
  revalidatePath(`/motoboys/${motoboyId}`);
}

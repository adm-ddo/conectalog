"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireTenantCompleto, criarTokenAutenticacaoUsuario } from "@/lib/auth-empresa";
import { hashSenha } from "@/lib/senha";
import { enviarEmailRecuperacaoSenhaUsuario } from "@/lib/email";
import type { ModoRemuneracaoGestor } from "@/generated/prisma/enums";
import { LIMITE_GESTORES_POR_CLIENTE } from "@/lib/gestorConfig";

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
  const sessao = await requireTenantCompleto();

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
  const sessao = await requireTenantCompleto();
  await prisma.motoboy.updateMany({
    where: { id: motoboyId, empresaId: sessao.empresaEfetivoId },
    data: { tipoEquipamento },
  });
  revalidatePath(`/motoboys/${motoboyId}`);
  revalidatePath("/motoboys");
}

export async function alternarAtivoMotoboy(motoboyId: number, ativo: boolean) {
  const sessao = await requireTenantCompleto();
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
  const sessao = await requireTenantCompleto();

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
  const sessao = await requireTenantCompleto();
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
  const sessao = await requireTenantCompleto();
  await prisma.motoboy.updateMany({
    where: { id: motoboyId, empresaId: sessao.empresaEfetivoId, aprovadoEm: null },
    data: { empresaId: null, aprovadoEm: null, livre: false },
  });
  revalidatePath("/motoboys");
}

export async function alternarLivreMotoboy(motoboyId: number, livre: boolean) {
  const sessao = await requireTenantCompleto();
  await prisma.motoboy.updateMany({
    where: { id: motoboyId, empresaId: sessao.empresaEfetivoId },
    data: { livre },
  });
  revalidatePath(`/motoboys/${motoboyId}`);
}

/** DIARIA = "free", recebe a cada turno fechado. SEMANAL = "moto fixa",
 * entra no fechamento semanal junto com o resto da equipe. */
export async function atualizarFrequenciaPagamento(
  motoboyId: number,
  frequencia: "DIARIA" | "SEMANAL"
) {
  const sessao = await requireTenantCompleto();
  await prisma.motoboy.updateMany({
    where: { id: motoboyId, empresaId: sessao.empresaEfetivoId },
    data: { frequenciaPagamento: frequencia },
  });
  revalidatePath(`/motoboys/${motoboyId}`);
}

/** Liga/desliga o desconto automático de atraso pra esse motoboy (ver
 * Empresa.toleranciaAtrasoMinutos e DescontoAssiduidade). */
export async function alternarDescontoAssiduidade(motoboyId: number, ativo: boolean) {
  const sessao = await requireTenantCompleto();
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
  const sessao = await requireTenantCompleto();

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
  const sessao = await requireTenantCompleto();

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
  const sessao = await requireTenantCompleto();
  await prisma.vale.updateMany({
    where: { id: valeId, empresaId: sessao.empresaEfetivoId },
    data: { descontadoEm: new Date() },
  });
  revalidatePath(`/motoboys/${motoboyId}`);
}

/** Cria (ou reativa) o login de painel pareado com esse Motoboy, papel
 * GESTOR_CAMPO — dois logins de verdade e isolados (nunca compartilha
 * senha nem sessão com o Motoboy), só ligados por
 * Usuario.motoboyVinculadoId. A senha nasce aleatória e inutilizável de
 * propósito: quem usa é o e-mail de "defina sua senha" (mesmo token de
 * recuperação de senha já usado em /redefinir-senha). */
async function provisionarUsuarioGestor(motoboy: {
  id: number;
  empresaId: number;
  nomeCompleto: string;
  email: string;
}): Promise<{ erro?: string }> {
  const existente = await prisma.usuario.findUnique({ where: { motoboyVinculadoId: motoboy.id } });
  if (existente) {
    if (!existente.ativo) {
      await prisma.usuario.update({ where: { id: existente.id }, data: { ativo: true } });
    }
    return {};
  }

  const colisao = await prisma.usuario.findUnique({ where: { email: motoboy.email } });
  if (colisao) {
    return { erro: "Já existe um login de painel com esse e-mail — não dá pra criar o de gestor." };
  }

  const senhaInutilizavel = await hashSenha(randomBytes(24).toString("hex"));
  const criado = await prisma.usuario.create({
    data: {
      empresaId: motoboy.empresaId,
      nome: motoboy.nomeCompleto,
      email: motoboy.email,
      senhaHash: senhaInutilizavel,
      role: "GESTOR_CAMPO",
      // O e-mail já foi confirmado do lado do app do motoboy — não faz
      // sentido pedir de novo aqui.
      emailVerificadoEm: new Date(),
      motoboyVinculadoId: motoboy.id,
    },
  });

  const token = await criarTokenAutenticacaoUsuario(criado.id, "RECUPERACAO_SENHA");
  await enviarEmailRecuperacaoSenhaUsuario(motoboy.email, motoboy.nomeCompleto, token);
  return {};
}

export type AlternarGestorResult = { erro?: string } | undefined;

/** Liga/desliga o motoboy como Gestor de campo. Ao ligar, provisiona (ou
 * reativa) o login de painel pareado. Ao desligar, desativa esse login
 * (não apaga — pode ter escalas criadas no histórico, ver
 * EscalaTurno.criadoPorUsuario) e tira ele de gestor de todos os
 * clientes que respondia. */
export async function alternarEhGestor(
  motoboyId: number,
  ehGestor: boolean
): Promise<AlternarGestorResult> {
  const sessao = await requireTenantCompleto();
  const motoboy = await prisma.motoboy.findFirst({
    where: { id: motoboyId, empresaId: sessao.empresaEfetivoId },
  });
  if (!motoboy) return { erro: "Motoboy não encontrado." };
  if (motoboy.empresaId === null) return { erro: "Motoboy não encontrado." };

  if (ehGestor) {
    const resultado = await provisionarUsuarioGestor({ ...motoboy, empresaId: motoboy.empresaId });
    if (resultado.erro) return resultado;
    await prisma.motoboy.update({ where: { id: motoboyId }, data: { ehGestor: true } });
  } else {
    await prisma.$transaction([
      prisma.motoboy.update({ where: { id: motoboyId }, data: { ehGestor: false } }),
      prisma.motoboyCliente.updateMany({ where: { motoboyId }, data: { gestor: false } }),
      prisma.usuario.updateMany({
        where: { motoboyVinculadoId: motoboyId },
        data: { ativo: false },
      }),
    ]);
  }

  revalidatePath(`/motoboys/${motoboyId}`);
}

/** Liga/desliga esse motoboy como Gestor responsável por um cliente
 * específico — no máximo LIMITE_GESTORES_POR_CLIENTE por cliente. Ligar
 * também libera ele nesse cliente (gestor sem estar liberado não faz
 * sentido). */
export async function alternarGestorCliente(
  motoboyId: number,
  clienteId: number,
  gestor: boolean
): Promise<AlternarGestorResult> {
  const sessao = await requireTenantCompleto();

  const [motoboy, cliente] = await Promise.all([
    prisma.motoboy.findFirst({ where: { id: motoboyId, empresaId: sessao.empresaEfetivoId } }),
    prisma.cliente.findFirst({ where: { id: clienteId, empresaId: sessao.empresaEfetivoId } }),
  ]);
  if (!motoboy || !cliente) return { erro: "Motoboy ou cliente inválido." };
  if (!motoboy.ehGestor) return { erro: "Marque o motoboy como Gestor antes de atribuir clientes." };

  if (gestor) {
    const totalGestoresNoCliente = await prisma.motoboyCliente.count({
      where: { clienteId, gestor: true, motoboyId: { not: motoboyId } },
    });
    if (totalGestoresNoCliente >= LIMITE_GESTORES_POR_CLIENTE) {
      return {
        erro: `${cliente.nome} já tem ${LIMITE_GESTORES_POR_CLIENTE} gestores — tire um antes de adicionar outro.`,
      };
    }
  }

  await prisma.motoboyCliente.upsert({
    where: { motoboyId_clienteId: { motoboyId, clienteId } },
    update: { gestor, ...(gestor ? { liberado: true } : {}) },
    create: { motoboyId, clienteId, gestor, liberado: true },
  });

  revalidatePath(`/motoboys/${motoboyId}`);
}

/** Define como as bandas que o próprio Gestor faz (motoboy de verdade,
 * não gestão) são remuneradas — ver Motoboy.modoRemuneracaoGestor. */
export async function atualizarRemuneracaoGestor(
  motoboyId: number,
  modo: ModoRemuneracaoGestor,
  valorEspecial: number | null
) {
  const sessao = await requireTenantCompleto();
  await prisma.motoboy.updateMany({
    where: { id: motoboyId, empresaId: sessao.empresaEfetivoId },
    data: {
      modoRemuneracaoGestor: modo,
      valorBandaGestorEspecial: modo === "VALOR_ESPECIAL" ? valorEspecial : null,
    },
  });
  revalidatePath(`/motoboys/${motoboyId}`);
}

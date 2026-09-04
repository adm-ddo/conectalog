"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashSenha } from "@/lib/senha";
import { criarTokenAutenticacaoMotoboy } from "@/lib/auth-motoboy";
import { uploadDataUrl } from "@/lib/blob";
import { enviarEmailVerificacaoMotoboy } from "@/lib/email";
import type { TipoChavePix, TipoEquipamento } from "@/generated/prisma/enums";

export type DadosCadastroMotoboy = {
  tokenEmpresa: string;
  nomeCompleto: string;
  dataNascimento: string;
  cpf: string;
  email: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  cep: string;
  telefoneCelular: string;
  telefoneEmergencia: string;
  chavePix: string;
  tipoChavePix: TipoChavePix;
  tipoEquipamento: TipoEquipamento;
  senha: string;
  fotoPerfilDataUrl: string;
  cnhDataUrl: string;
};

export type CadastroState = { erro?: string } | undefined;

/** Cadastro próprio do motoboy — cobre dois casos com a mesma ação:
 * (1) CPF/e-mail novo: cria o registro do zero; (2) a cooperativa já
 * cadastrou ele manualmente (Motoboy sem senhaHash): esse fluxo
 * "reivindica" esse registro, completando os dados de autocadastro em
 * cima dele, em vez de criar um duplicado (cpf/email são @unique).
 *
 * Manda e-mail de verificação em vez de logar direto — mesmo padrão do
 * extras-app (Usuario/Pessoa): só entra no app depois de clicar no link
 * de confirmação, ver src/app/app/verificar-email/[token]/actions.ts.
 *
 * `tokenEmpresa` vem do link que a cooperativa gerou
 * (/app/cadastro/[token]) — é isso que decide em qual cooperativa o
 * motoboy entra. Sem link válido, não tem cadastro: descobrir e pedir
 * credenciamento em outra cooperativa é uma fase futura. */
export async function cadastrarMotoboy(
  dados: DadosCadastroMotoboy
): Promise<CadastroState> {
  const empresa = await prisma.empresa.findUnique({
    where: { tokenCadastroMotoboy: dados.tokenEmpresa },
  });
  if (!empresa) {
    return { erro: "Esse link de cadastro não é mais válido. Peça um novo pra cooperativa." };
  }

  const cpf = dados.cpf.replace(/\D/g, "");
  const email = dados.email.trim().toLowerCase();

  if (
    !dados.nomeCompleto.trim() ||
    !dados.dataNascimento ||
    cpf.length !== 11 ||
    !email ||
    !dados.endereco.trim() ||
    !dados.telefoneCelular.trim() ||
    !dados.telefoneEmergencia.trim() ||
    !dados.chavePix.trim()
  ) {
    return { erro: "Preencha todos os dados obrigatórios." };
  }
  if (dados.senha.length < 6) {
    return { erro: "A senha precisa ter pelo menos 6 caracteres." };
  }
  if (!dados.fotoPerfilDataUrl) {
    return { erro: "Falta tirar a foto de perfil." };
  }
  if (!dados.cnhDataUrl) {
    return { erro: "Falta a foto ou o anexo da CNH." };
  }
  if (!dados.tipoEquipamento) {
    return { erro: "Informe qual equipamento de entrega você usa." };
  }

  const existente = await prisma.motoboy.findFirst({ where: { OR: [{ cpf }, { email }] } });
  if (existente && existente.senhaHash) {
    return { erro: "Já existe uma conta com esse CPF ou e-mail. Faça login." };
  }
  if (existente && existente.empresaId !== empresa.id) {
    return {
      erro: "Esse CPF ou e-mail já está cadastrado em outra cooperativa. Confira o link que você usou.",
    };
  }

  const senhaHash = await hashSenha(dados.senha);
  const [fotoPerfilUrl, cnhFotoUrl] = await Promise.all([
    uploadDataUrl(`motoboys/foto-perfil-${Date.now()}.jpg`, dados.fotoPerfilDataUrl),
    uploadDataUrl(`motoboys/cnh-${Date.now()}.jpg`, dados.cnhDataUrl),
  ]);

  const dadosComuns = {
    nomeCompleto: dados.nomeCompleto.trim(),
    dataNascimento: new Date(dados.dataNascimento),
    endereco: dados.endereco.trim(),
    numero: dados.numero.trim() || null,
    complemento: dados.complemento.trim() || null,
    bairro: dados.bairro.trim() || null,
    cidade: dados.cidade.trim() || null,
    cep: dados.cep.trim() || null,
    telefoneCelular: dados.telefoneCelular.trim(),
    telefoneEmergencia: dados.telefoneEmergencia.trim(),
    chavePix: dados.chavePix.trim(),
    tipoChavePix: dados.tipoChavePix,
    tipoEquipamento: dados.tipoEquipamento,
    senhaHash,
    emailVerificadoEm: null,
    fotoPerfilUrl,
    cnhFotoUrl,
  };

  let motoboyId: number;
  try {
    if (existente) {
      const atualizado = await prisma.motoboy.update({
        where: { id: existente.id },
        data: { ...dadosComuns, cpf, email },
      });
      motoboyId = atualizado.id;
    } else {
      // Quem se cadastra pelo link específico da cooperativa já entra
      // liberado em qualquer cliente dela ("livre") e já aprovado — o
      // link em si já é o convite/aprovação, não faz sentido pedir
      // liberação ou aprovação manual de novo depois (diferente de quem
      // "pede vaga" sem link, ver solicitarVagaMotoboy abaixo).
      const criado = await prisma.motoboy.create({
        data: { empresaId: empresa.id, cpf, email, livre: true, aprovadoEm: new Date(), ...dadosComuns },
      });
      motoboyId = criado.id;
    }
  } catch {
    return { erro: "Já existe uma conta com esse CPF ou e-mail." };
  }

  const token = await criarTokenAutenticacaoMotoboy(motoboyId, "VERIFICACAO_EMAIL");
  await enviarEmailVerificacaoMotoboy(email, dados.nomeCompleto, token);

  redirect("/app/cadastro/verifique-seu-email");
}

export type DadosSolicitarVaga = Omit<DadosCadastroMotoboy, "tokenEmpresa"> & {
  empresaId: number;
};

/** "Pedir vaga" sem link — o motoboy escolhe a cooperativa direto no app
 * (ver /app/cadastro, sem token na URL). Diferente de cadastrarMotoboy
 * (que já vem convidado/aprovado pelo link), aqui a cooperativa ainda não
 * sabe dessa pessoa: entra com `livre: false` e `aprovadoEm: null`, e só
 * consegue logar depois que alguém do painel aprovar (ver
 * aprovarSolicitacaoMotoboy em motoboys/actions.ts). Continua exigindo
 * confirmação de e-mail também — são dois cuidados independentes (e-mail
 * é de verdade / cooperativa realmente quer essa pessoa). */
export async function solicitarVagaMotoboy(
  dados: DadosSolicitarVaga
): Promise<CadastroState> {
  const empresa = await prisma.empresa.findUnique({ where: { id: dados.empresaId } });
  if (!empresa) {
    return { erro: "Cooperativa inválida — escolha novamente." };
  }

  const cpf = dados.cpf.replace(/\D/g, "");
  const email = dados.email.trim().toLowerCase();

  if (
    !dados.nomeCompleto.trim() ||
    !dados.dataNascimento ||
    cpf.length !== 11 ||
    !email ||
    !dados.endereco.trim() ||
    !dados.telefoneCelular.trim() ||
    !dados.telefoneEmergencia.trim() ||
    !dados.chavePix.trim()
  ) {
    return { erro: "Preencha todos os dados obrigatórios." };
  }
  if (dados.senha.length < 6) {
    return { erro: "A senha precisa ter pelo menos 6 caracteres." };
  }
  if (!dados.fotoPerfilDataUrl) {
    return { erro: "Falta tirar a foto de perfil." };
  }
  if (!dados.cnhDataUrl) {
    return { erro: "Falta a foto ou o anexo da CNH." };
  }
  if (!dados.tipoEquipamento) {
    return { erro: "Informe qual equipamento de entrega você usa." };
  }

  const existente = await prisma.motoboy.findFirst({ where: { OR: [{ cpf }, { email }] } });
  if (existente) {
    return {
      erro:
        "Já existe um cadastro com esse CPF ou e-mail. Se a cooperativa já te cadastrou, peça o link de acesso a ela em vez de pedir vaga aqui.",
    };
  }

  const senhaHash = await hashSenha(dados.senha);
  const [fotoPerfilUrl, cnhFotoUrl] = await Promise.all([
    uploadDataUrl(`motoboys/foto-perfil-${Date.now()}.jpg`, dados.fotoPerfilDataUrl),
    uploadDataUrl(`motoboys/cnh-${Date.now()}.jpg`, dados.cnhDataUrl),
  ]);

  let motoboyId: number;
  try {
    const criado = await prisma.motoboy.create({
      data: {
        empresaId: empresa.id,
        cpf,
        email,
        livre: false,
        aprovadoEm: null,
        nomeCompleto: dados.nomeCompleto.trim(),
        dataNascimento: new Date(dados.dataNascimento),
        endereco: dados.endereco.trim(),
        numero: dados.numero.trim() || null,
        complemento: dados.complemento.trim() || null,
        bairro: dados.bairro.trim() || null,
        cidade: dados.cidade.trim() || null,
        cep: dados.cep.trim() || null,
        telefoneCelular: dados.telefoneCelular.trim(),
        telefoneEmergencia: dados.telefoneEmergencia.trim(),
        chavePix: dados.chavePix.trim(),
        tipoChavePix: dados.tipoChavePix,
        tipoEquipamento: dados.tipoEquipamento,
        senhaHash,
        emailVerificadoEm: null,
        fotoPerfilUrl,
        cnhFotoUrl,
      },
    });
    motoboyId = criado.id;
  } catch {
    return { erro: "Já existe uma conta com esse CPF ou e-mail." };
  }

  const token = await criarTokenAutenticacaoMotoboy(motoboyId, "VERIFICACAO_EMAIL");
  await enviarEmailVerificacaoMotoboy(email, dados.nomeCompleto, token);

  redirect("/app/cadastro/verifique-seu-email");
}

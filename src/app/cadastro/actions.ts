"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashSenha } from "@/lib/senha";
import { criarTokenAutenticacaoUsuario } from "@/lib/auth-empresa";
import { enviarEmailVerificacaoUsuario } from "@/lib/email";

export type CadastroCooperativaState = { erro?: string } | undefined;

/** Cadastro público de uma cooperativa nova — cria a Empresa (tenant) e
 * o primeiro Usuario dela (MASTER). Manda e-mail de verificação em vez
 * de logar direto, mesmo padrão do cadastro do motoboy. */
export async function cadastrarCooperativa(
  _prev: CadastroCooperativaState,
  formData: FormData
): Promise<CadastroCooperativaState> {
  const nomeEmpresa = String(formData.get("nomeEmpresa") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");

  if (!nomeEmpresa || !nome || !email) {
    return { erro: "Preencha todos os campos." };
  }
  if (senha.length < 6) {
    return { erro: "A senha precisa ter pelo menos 6 caracteres." };
  }

  const jaExiste = await prisma.usuario.findUnique({ where: { email } });
  if (jaExiste) {
    return { erro: "Já existe uma conta com esse e-mail." };
  }

  const senhaHash = await hashSenha(senha);
  const tokenCadastroMotoboy = randomBytes(16).toString("hex");

  const { usuarioId } = await prisma.$transaction(async (tx) => {
    const empresa = await tx.empresa.create({
      data: { nome: nomeEmpresa, tokenCadastroMotoboy },
    });
    const usuario = await tx.usuario.create({
      data: { empresaId: empresa.id, nome, email, senhaHash, role: "MASTER" },
    });
    return { usuarioId: usuario.id };
  });

  const token = await criarTokenAutenticacaoUsuario(usuarioId, "VERIFICACAO_EMAIL");
  await enviarEmailVerificacaoUsuario(email, nome, token);

  redirect("/cadastro/verifique-seu-email");
}

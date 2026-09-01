"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verificarSenha } from "@/lib/senha";
import {
  criarSessaoEmpresa,
  criarTokenAutenticacaoUsuario,
  tokenUsuarioRecenteExiste,
} from "@/lib/auth-empresa";
import { enviarEmailVerificacaoUsuario } from "@/lib/email";

export type LoginState = { erro?: string; naoVerificado?: boolean } | undefined;

export async function entrar(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const senha = String(formData.get("senha") ?? "");

  if (!email || !senha) {
    return { erro: "Preencha e-mail e senha." };
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario || !usuario.ativo || !(await verificarSenha(senha, usuario.senhaHash))) {
    return { erro: "E-mail ou senha incorretos." };
  }
  if (usuario.emailVerificadoEm === null) {
    return {
      erro: "Confirme seu e-mail antes de entrar — veja o link que mandamos pra você.",
      naoVerificado: true,
    };
  }

  await criarSessaoEmpresa(usuario.id);
  redirect("/dashboard");
}

export type ReenviarVerificacaoState = { erro?: string; sucesso?: boolean } | undefined;

export async function reenviarVerificacaoEmail(
  _prev: ReenviarVerificacaoState,
  formData: FormData
): Promise<ReenviarVerificacaoState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { erro: "Informe o e-mail." };

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (usuario && usuario.emailVerificadoEm === null) {
    const jaTemTokenRecente = await tokenUsuarioRecenteExiste(usuario.id, "VERIFICACAO_EMAIL", 2);
    if (!jaTemTokenRecente) {
      const token = await criarTokenAutenticacaoUsuario(usuario.id, "VERIFICACAO_EMAIL");
      await enviarEmailVerificacaoUsuario(email, usuario.nome, token);
    }
  }

  return { sucesso: true };
}

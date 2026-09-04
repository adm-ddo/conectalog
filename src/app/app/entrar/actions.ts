"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verificarSenha } from "@/lib/senha";
import {
  criarSessaoMotoboy,
  criarTokenAutenticacaoMotoboy,
  tokenMotoboyRecenteExiste,
} from "@/lib/auth-motoboy";
import { enviarEmailVerificacaoMotoboy } from "@/lib/email";

export type LoginMotoboyState =
  | { erro?: string; naoVerificado?: boolean; aguardandoAprovacao?: boolean }
  | undefined;

export async function entrarMotoboy(
  _prev: LoginMotoboyState,
  formData: FormData
): Promise<LoginMotoboyState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");

  if (!email || !senha) {
    return { erro: "Preencha e-mail e senha." };
  }

  const motoboy = await prisma.motoboy.findUnique({ where: { email } });
  if (!motoboy || !motoboy.ativo || !motoboy.senhaHash) {
    return { erro: "E-mail ou senha incorretos." };
  }
  if (!(await verificarSenha(senha, motoboy.senhaHash))) {
    return { erro: "E-mail ou senha incorretos." };
  }
  if (motoboy.emailVerificadoEm === null) {
    return {
      erro: "Confirme seu e-mail antes de entrar — veja o link que mandamos pra você.",
      naoVerificado: true,
    };
  }
  if (motoboy.aprovadoEm === null) {
    return {
      erro: "Seu cadastro ainda está aguardando aprovação da cooperativa.",
      aguardandoAprovacao: true,
    };
  }

  await criarSessaoMotoboy(motoboy.id);
  redirect("/app/inicio");
}

export type ReenviarVerificacaoState = { erro?: string; sucesso?: boolean } | undefined;

/** Sempre resposta genérica (não revela se o e-mail existe na base),
 * mesmo cuidado do extras-app. */
export async function reenviarVerificacaoMotoboy(
  _prev: ReenviarVerificacaoState,
  formData: FormData
): Promise<ReenviarVerificacaoState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { erro: "Informe o e-mail." };

  const motoboy = await prisma.motoboy.findUnique({ where: { email } });
  if (motoboy && motoboy.senhaHash && motoboy.emailVerificadoEm === null) {
    const jaTemTokenRecente = await tokenMotoboyRecenteExiste(motoboy.id, "VERIFICACAO_EMAIL", 2);
    if (!jaTemTokenRecente) {
      const token = await criarTokenAutenticacaoMotoboy(motoboy.id, "VERIFICACAO_EMAIL");
      await enviarEmailVerificacaoMotoboy(email, motoboy.nomeCompleto, token);
    }
  }

  return { sucesso: true };
}

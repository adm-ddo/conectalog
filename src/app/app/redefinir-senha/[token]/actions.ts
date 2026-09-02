"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashSenha } from "@/lib/senha";
import { buscarTokenMotoboyValido } from "@/lib/auth-motoboy";

export type RedefinirSenhaState = { erro?: string } | undefined;

const ERRO_TOKEN_INVALIDO = "Esse link não é mais válido — peça um novo em \"Esqueci minha senha\".";

export async function redefinirSenhaMotoboy(
  token: string,
  _prev: RedefinirSenhaState,
  formData: FormData
): Promise<RedefinirSenhaState> {
  const novaSenha = String(formData.get("novaSenha") ?? "");
  const confirmarSenha = String(formData.get("confirmarSenha") ?? "");

  if (!novaSenha || !confirmarSenha) {
    return { erro: "Preencha todos os campos." };
  }
  if (novaSenha.length < 6) {
    return { erro: "A senha precisa ter pelo menos 6 caracteres." };
  }
  if (novaSenha !== confirmarSenha) {
    return { erro: "As senhas não conferem." };
  }

  const resultado = await buscarTokenMotoboyValido(token, "RECUPERACAO_SENHA");
  if (!resultado.valido) {
    return { erro: ERRO_TOKEN_INVALIDO };
  }

  const senhaHash = await hashSenha(novaSenha);

  await prisma.$transaction([
    prisma.motoboy.update({ where: { id: resultado.motoboyId }, data: { senhaHash } }),
    prisma.tokenAutenticacaoMotoboy.update({
      where: { id: resultado.tokenId },
      data: { usadoEm: new Date() },
    }),
    // Redefinir a senha derruba qualquer sessão aberta em outro
    // dispositivo — mesmo cuidado do lado da cooperativa.
    prisma.sessaoMotoboy.deleteMany({ where: { motoboyId: resultado.motoboyId } }),
  ]);

  redirect("/app/entrar");
}

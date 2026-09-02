"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashSenha } from "@/lib/senha";
import { buscarTokenUsuarioValido } from "@/lib/auth-empresa";

export type RedefinirSenhaState = { erro?: string } | undefined;

const ERRO_TOKEN_INVALIDO = "Esse link não é mais válido — peça um novo em \"Esqueci minha senha\".";

export async function redefinirSenha(
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

  const resultado = await buscarTokenUsuarioValido(token, "RECUPERACAO_SENHA");
  if (!resultado.valido) {
    return { erro: ERRO_TOKEN_INVALIDO };
  }

  const senhaHash = await hashSenha(novaSenha);

  await prisma.$transaction([
    prisma.usuario.update({ where: { id: resultado.usuarioId }, data: { senhaHash } }),
    prisma.tokenAutenticacaoUsuario.update({
      where: { id: resultado.tokenId },
      data: { usadoEm: new Date() },
    }),
    // Redefinir a senha derruba qualquer sessão aberta em outro
    // dispositivo — mesmo cuidado do extras-app.
    prisma.sessao.deleteMany({ where: { usuarioId: resultado.usuarioId } }),
  ]);

  redirect("/login");
}

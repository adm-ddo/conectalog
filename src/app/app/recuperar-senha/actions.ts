"use server";

import { prisma } from "@/lib/prisma";
import { criarTokenAutenticacaoMotoboy, tokenMotoboyRecenteExiste } from "@/lib/auth-motoboy";
import { enviarEmailRecuperacaoSenhaMotoboy } from "@/lib/email";

export type RecuperarSenhaState = { erro?: string; sucesso?: boolean } | undefined;

/** Sempre a mesma mensagem de sucesso, exista ou não o e-mail na base —
 * nunca revela quem está cadastrado. */
export async function solicitarRecuperacaoSenhaMotoboy(
  _prev: RecuperarSenhaState,
  formData: FormData
): Promise<RecuperarSenhaState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) return { erro: "Informe o e-mail." };

  const motoboy = await prisma.motoboy.findUnique({ where: { email } });
  if (motoboy?.senhaHash) {
    const jaTemTokenRecente = await tokenMotoboyRecenteExiste(motoboy.id, "RECUPERACAO_SENHA", 2);
    if (!jaTemTokenRecente) {
      const token = await criarTokenAutenticacaoMotoboy(motoboy.id, "RECUPERACAO_SENHA");
      await enviarEmailRecuperacaoSenhaMotoboy(email, motoboy.nomeCompleto, token);
    }
  }

  return { sucesso: true };
}

"use server";

import { prisma } from "@/lib/prisma";
import { criarTokenAutenticacaoUsuario, tokenUsuarioRecenteExiste } from "@/lib/auth-empresa";
import { enviarEmailRecuperacaoSenhaUsuario } from "@/lib/email";

export type RecuperarSenhaState = { erro?: string; sucesso?: boolean } | undefined;

/** Sempre a mesma mensagem de sucesso, exista ou não o e-mail na base —
 * nunca revela quem está cadastrado. */
export async function solicitarRecuperacaoSenha(
  _prev: RecuperarSenhaState,
  formData: FormData
): Promise<RecuperarSenhaState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) return { erro: "Informe o e-mail." };

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (usuario) {
    // Evita spam de clique no botão: não manda outro e-mail se já existe
    // um link válido enviado há menos de 2 minutos.
    const jaTemTokenRecente = await tokenUsuarioRecenteExiste(usuario.id, "RECUPERACAO_SENHA", 2);
    if (!jaTemTokenRecente) {
      const token = await criarTokenAutenticacaoUsuario(usuario.id, "RECUPERACAO_SENHA");
      await enviarEmailRecuperacaoSenhaUsuario(email, usuario.nome, token);
    }
  }

  return { sucesso: true };
}

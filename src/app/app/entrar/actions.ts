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
  | { erro?: string; naoVerificado?: boolean; duploAcesso?: boolean }
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

  // Sem cooperativa (na "prateleira"), pedido pendente ou já vinculado —
  // login sempre funciona a partir daqui; quem decide o que mostrar é o
  // layout de (logado), não o login em si (ver src/app/app/(logado)/layout.tsx).
  await criarSessaoMotoboy(motoboy.id);

  // Mesmo e-mail também tem login de painel (senha independente) — deixa
  // escolher pra onde ir. Não conta o login pareado de Gestor de campo
  // (Usuario.motoboyVinculadoId), que já tem o link "Painel Gestor" fixo
  // no cabeçalho do app — perguntar de novo aqui seria repetitivo. Filtra
  // isso em JS, não no where do Prisma: motoboyVinculadoId é null pra
  // quase todo mundo, e "not" no Postgres nunca bate com NULL (comparação
  // com NULL nunca é verdadeira), então um filtro `not: motoboy.id` direto
  // no banco deixaria de achar exatamente o caso mais comum.
  const usuario = await prisma.usuario.findFirst({ where: { email } });
  if (usuario && usuario.motoboyVinculadoId !== motoboy.id) {
    return { duploAcesso: true };
  }

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

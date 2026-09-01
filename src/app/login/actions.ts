"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verificarSenha } from "@/lib/senha";
import { criarSessaoEmpresa } from "@/lib/auth-empresa";

export type LoginState = { erro?: string } | undefined;

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

  await criarSessaoEmpresa(usuario.id);
  redirect("/dashboard");
}

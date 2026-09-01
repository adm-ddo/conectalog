"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verificarSenha } from "@/lib/senha";
import { criarSessaoMotoboy } from "@/lib/auth-motoboy";

export type LoginMotoboyState = { erro?: string } | undefined;

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

  await criarSessaoMotoboy(motoboy.id);
  redirect("/app/inicio");
}

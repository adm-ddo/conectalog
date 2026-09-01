"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verificarSenha } from "@/lib/senha";
import { criarSessaoCliente } from "@/lib/auth-cliente";

export type LoginPortalState = { erro?: string } | undefined;

export async function entrarPortal(
  _prev: LoginPortalState,
  formData: FormData
): Promise<LoginPortalState> {
  const loginPortal = String(formData.get("loginPortal") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");

  if (!loginPortal || !senha) {
    return { erro: "Preencha o login e a senha." };
  }

  const cliente = await prisma.cliente.findUnique({ where: { loginPortal } });
  if (!cliente || !cliente.ativo || !cliente.senhaHashPortal) {
    return { erro: "Login ou senha incorretos." };
  }
  if (!(await verificarSenha(senha, cliente.senhaHashPortal))) {
    return { erro: "Login ou senha incorretos." };
  }

  await criarSessaoCliente(cliente.id);
  redirect("/portal/escala");
}

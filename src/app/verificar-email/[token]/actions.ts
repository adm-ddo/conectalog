"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buscarTokenUsuarioValido, criarSessaoEmpresa } from "@/lib/auth-empresa";

export type ConfirmarEmailState = { erro?: string } | undefined;

export async function confirmarVerificacaoEmailUsuario(
  _prev: ConfirmarEmailState,
  formData: FormData
): Promise<ConfirmarEmailState> {
  const token = String(formData.get("token") ?? "");
  const resultado = await buscarTokenUsuarioValido(token, "VERIFICACAO_EMAIL");
  if (!resultado.valido) {
    return { erro: "Esse link não é mais válido — peça um novo na tela de login." };
  }

  await prisma.$transaction([
    prisma.usuario.update({
      where: { id: resultado.usuarioId },
      data: { emailVerificadoEm: new Date() },
    }),
    prisma.tokenAutenticacaoUsuario.update({
      where: { id: resultado.tokenId },
      data: { usadoEm: new Date() },
    }),
  ]);

  await criarSessaoEmpresa(resultado.usuarioId);
  redirect("/dashboard");
}

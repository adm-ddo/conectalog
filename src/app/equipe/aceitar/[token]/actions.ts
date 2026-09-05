"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashSenha } from "@/lib/senha";
import { criarSessaoEmpresa } from "@/lib/auth-empresa";

export type AceitarConviteState = { erro?: string } | undefined;

export async function aceitarConvite(
  token: string,
  _prev: AceitarConviteState,
  formData: FormData
): Promise<AceitarConviteState> {
  const nome = String(formData.get("nome") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  if (!nome) return { erro: "Informe seu nome." };
  if (senha.length < 6) return { erro: "A senha precisa ter pelo menos 6 caracteres." };

  const convite = await prisma.conviteEquipe.findUnique({ where: { token } });
  if (!convite || convite.aceitoEm !== null || convite.expiraEm < new Date()) {
    return { erro: "Esse convite não é mais válido." };
  }

  const jaEUsuario = await prisma.usuario.findUnique({ where: { email: convite.email } });
  if (jaEUsuario) {
    return { erro: "Esse e-mail já tem uma conta — faça login normalmente." };
  }

  const senhaHash = await hashSenha(senha);

  // Clicar no link do convite (que só chegou na caixa de entrada de quem
  // foi convidado) já prova posse do e-mail — não precisa de mais uma
  // verificação separada, diferente do cadastro público.
  const { usuarioId } = await prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.create({
      data: {
        empresaId: convite.empresaId,
        nome,
        email: convite.email,
        senhaHash,
        role: "GESTOR",
        emailVerificadoEm: new Date(),
        podeAcessarFinanceiro: convite.podeAcessarFinanceiro,
      },
    });
    await tx.conviteEquipe.update({
      where: { id: convite.id },
      data: { aceitoEm: new Date() },
    });
    return { usuarioId: usuario.id };
  });

  await criarSessaoEmpresa(usuarioId);
  redirect("/dashboard");
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMaster, criarConviteEquipe } from "@/lib/auth-empresa";
import { enviarEmailConviteEquipe } from "@/lib/email";

export type ConvidarState = { erro?: string } | undefined;

export async function convidarMembro(
  _prev: ConvidarState,
  formData: FormData
): Promise<ConvidarState> {
  const sessao = await requireMaster();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { erro: "Informe um e-mail." };

  const jaEUsuario = await prisma.usuario.findUnique({ where: { email } });
  if (jaEUsuario) return { erro: "Esse e-mail já tem uma conta." };

  const conviteJaPendente = await prisma.conviteEquipe.findFirst({
    where: { empresaId: sessao.empresaEfetivoId, email, aceitoEm: null, expiraEm: { gt: new Date() } },
  });
  if (conviteJaPendente) return { erro: "Já tem um convite pendente pra esse e-mail." };

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: sessao.empresaEfetivoId },
    select: { nome: true },
  });

  const token = await criarConviteEquipe(sessao.empresaEfetivoId, email, sessao.usuarioId);
  await enviarEmailConviteEquipe(email, empresa.nome, token);

  revalidatePath("/equipe");
}

export async function cancelarConvite(conviteId: number) {
  const sessao = await requireMaster();
  await prisma.conviteEquipe.deleteMany({
    where: { id: conviteId, empresaId: sessao.empresaEfetivoId, aceitoEm: null },
  });
  revalidatePath("/equipe");
}

export async function alternarAtivoMembro(usuarioId: number, ativo: boolean) {
  const sessao = await requireMaster();
  // Nunca deixa o MASTER se autodesativar por engano e ficar trancado
  // fora do próprio painel.
  if (usuarioId === sessao.usuarioId) return;
  await prisma.usuario.updateMany({
    where: { id: usuarioId, empresaId: sessao.empresaEfetivoId, role: "GESTOR" },
    data: { ativo },
  });
  revalidatePath("/equipe");
}

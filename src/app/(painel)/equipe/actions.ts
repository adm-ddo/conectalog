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

  const podeAcessarFinanceiro = formData.get("podeAcessarFinanceiro") === "on";
  const token = await criarConviteEquipe(
    sessao.empresaEfetivoId,
    email,
    sessao.usuarioId,
    podeAcessarFinanceiro
  );
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

/** Liga/desliga o acesso à tela /financeiro de um membro já cadastrado
 * (só pra quem já tem conta — pra convites ainda pendentes, o próprio
 * ConviteEquipe.podeAcessarFinanceiro decide, escolhido na hora de
 * convidar). Só GESTOR/GESTOR_CAMPO passam por aqui — MASTER sempre tem
 * acesso independente desse campo (ver requireFinanceiro). */
export async function alternarFinanceiroMembro(usuarioId: number, podeAcessarFinanceiro: boolean) {
  const sessao = await requireMaster();
  await prisma.usuario.updateMany({
    where: { id: usuarioId, empresaId: sessao.empresaEfetivoId, role: { not: "MASTER" } },
    data: { podeAcessarFinanceiro },
  });
  revalidatePath("/equipe");
}

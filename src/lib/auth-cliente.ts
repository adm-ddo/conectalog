import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

// Login do Cliente (empresa que contrata a cooperativa) no portal dele —
// terceiro sistema de sessão, isolado dos outros dois (auth-empresa.ts,
// auth-motoboy.ts) pelo mesmo motivo: uma falha aqui nunca deve
// derrubar o painel da cooperativa nem o app do motoboy.
export const SESSAO_CLIENTE_COOKIE = "cl_sessao_cliente";
const SESSAO_TTL_DIAS = 30;

export type SessaoCliente = {
  clienteId: number;
  empresaId: number;
  nome: string;
};

export async function criarSessaoCliente(clienteId: number): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiraEm = new Date(Date.now() + SESSAO_TTL_DIAS * 24 * 60 * 60 * 1000);
  await prisma.sessaoCliente.create({ data: { token, clienteId, expiraEm } });

  const cookieStore = await cookies();
  cookieStore.set(SESSAO_CLIENTE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiraEm,
    path: "/",
  });
  revalidatePath("/", "layout");
}

export async function destruirSessaoClienteAtual(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSAO_CLIENTE_COOKIE)?.value;
  if (token) {
    await prisma.sessaoCliente.deleteMany({ where: { token } });
  }
  cookieStore.delete(SESSAO_CLIENTE_COOKIE);
  revalidatePath("/", "layout");
}

export const getSessaoCliente = cache(async (): Promise<SessaoCliente | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSAO_CLIENTE_COOKIE)?.value;
  if (!token) return null;

  const sessao = await prisma.sessaoCliente.findUnique({
    where: { token },
    select: {
      expiraEm: true,
      cliente: { select: { id: true, empresaId: true, nome: true, ativo: true } },
    },
  });
  if (!sessao || sessao.expiraEm < new Date() || !sessao.cliente.ativo) return null;

  return {
    clienteId: sessao.cliente.id,
    empresaId: sessao.cliente.empresaId,
    nome: sessao.cliente.nome,
  };
});

/** Use no topo de toda page/action do portal do cliente. */
export async function requireCliente(): Promise<SessaoCliente> {
  const sessao = await getSessaoCliente();
  if (!sessao) redirect("/portal/entrar");
  return sessao;
}

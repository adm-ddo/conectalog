import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { RoleUsuario } from "@/generated/prisma/enums";

// Login do painel da cooperativa (Usuario) — deliberadamente isolado do
// login do Motoboy (ver auth-motoboy.ts): cookie, tabela de sessão e
// funções próprias, pra uma falha aqui nunca poder derrubar o app do
// motoboy (e vice-versa). Mesmo espírito de auth.ts/auth-pessoa.ts no
// extras-app.
export const SESSAO_EMPRESA_COOKIE = "cl_sessao_empresa";
const SESSAO_TTL_DIAS = 30;

export type SessaoEmpresa = {
  usuarioId: number;
  empresaId: number;
  nome: string;
  email: string;
  role: RoleUsuario;
};

export async function criarSessaoEmpresa(usuarioId: number): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiraEm = new Date(Date.now() + SESSAO_TTL_DIAS * 24 * 60 * 60 * 1000);
  await prisma.sessao.create({ data: { token, usuarioId, expiraEm } });

  const cookieStore = await cookies();
  cookieStore.set(SESSAO_EMPRESA_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiraEm,
    path: "/",
  });
  revalidatePath("/", "layout");
}

export async function destruirSessaoEmpresaAtual(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSAO_EMPRESA_COOKIE)?.value;
  if (token) {
    await prisma.sessao.deleteMany({ where: { token } });
  }
  cookieStore.delete(SESSAO_EMPRESA_COOKIE);
  revalidatePath("/", "layout");
}

// Memoizado por request: várias chamadas na mesma renderização batem no
// banco só uma vez.
export const getSessaoEmpresa = cache(
  async (): Promise<SessaoEmpresa | null> => {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSAO_EMPRESA_COOKIE)?.value;
    if (!token) return null;

    const sessao = await prisma.sessao.findUnique({
      where: { token },
      select: {
        expiraEm: true,
        usuario: {
          select: {
            id: true,
            empresaId: true,
            nome: true,
            email: true,
            role: true,
            ativo: true,
          },
        },
      },
    });
    if (!sessao || sessao.expiraEm < new Date() || !sessao.usuario.ativo) {
      return null;
    }

    return {
      usuarioId: sessao.usuario.id,
      empresaId: sessao.usuario.empresaId,
      nome: sessao.usuario.nome,
      email: sessao.usuario.email,
      role: sessao.usuario.role,
    };
  }
);

/** Use no topo de toda page/action do painel da cooperativa. */
export async function requireEmpresa(): Promise<SessaoEmpresa> {
  const sessao = await getSessaoEmpresa();
  if (!sessao) redirect("/login");
  return sessao;
}

/** Use nas ações restritas ao dono (ex.: criar outro login, mexer em
 * valores padrão da cooperativa). */
export async function requireMaster(): Promise<SessaoEmpresa> {
  const sessao = await requireEmpresa();
  if (sessao.role !== "MASTER") redirect("/dashboard");
  return sessao;
}

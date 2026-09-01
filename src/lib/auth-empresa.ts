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
const TOKEN_TTL_HORAS = 24;
const CONVITE_TTL_DIAS = 7;

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

/** Cria um token de uso único (verificação de e-mail / recuperação de
 * senha) do Usuario — espelha criarTokenAutenticacaoMotoboy. */
export async function criarTokenAutenticacaoUsuario(
  usuarioId: number,
  tipo: "VERIFICACAO_EMAIL" | "RECUPERACAO_SENHA"
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiraEm = new Date(Date.now() + TOKEN_TTL_HORAS * 60 * 60 * 1000);
  await prisma.tokenAutenticacaoUsuario.create({
    data: { token, usuarioId, tipo, expiraEm },
  });
  return token;
}

export type ResultadoTokenUsuarioValido =
  | { valido: true; usuarioId: number; tokenId: number }
  | { valido: false; motivo: "invalido" | "expirado" | "usado" };

export async function buscarTokenUsuarioValido(
  token: string,
  tipo: "VERIFICACAO_EMAIL" | "RECUPERACAO_SENHA"
): Promise<ResultadoTokenUsuarioValido> {
  const registro = await prisma.tokenAutenticacaoUsuario.findUnique({ where: { token } });
  if (!registro || registro.tipo !== tipo) return { valido: false, motivo: "invalido" };
  if (registro.usadoEm !== null) return { valido: false, motivo: "usado" };
  if (registro.expiraEm < new Date()) return { valido: false, motivo: "expirado" };
  return { valido: true, usuarioId: registro.usuarioId, tokenId: registro.id };
}

export async function tokenUsuarioRecenteExiste(
  usuarioId: number,
  tipo: "VERIFICACAO_EMAIL" | "RECUPERACAO_SENHA",
  minutosCooldown: number
): Promise<boolean> {
  const desde = new Date(Date.now() - minutosCooldown * 60 * 1000);
  const recente = await prisma.tokenAutenticacaoUsuario.findFirst({
    where: {
      usuarioId,
      tipo,
      usadoEm: null,
      criadoEm: { gte: desde },
      expiraEm: { gt: new Date() },
    },
  });
  return recente !== null;
}

/** Cria um convite de equipe (role GESTOR) — token vale 7 dias, bem mais
 * que o de verificação de e-mail, porque é comum a pessoa não ver o
 * e-mail logo de cara. */
export async function criarConviteEquipe(
  empresaId: number,
  email: string,
  criadoPorUsuarioId: number
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiraEm = new Date(Date.now() + CONVITE_TTL_DIAS * 24 * 60 * 60 * 1000);
  await prisma.conviteEquipe.create({
    data: { empresaId, email, token, criadoPorUsuarioId, expiraEm },
  });
  return token;
}

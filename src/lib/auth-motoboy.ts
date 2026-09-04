import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

// Login do Motoboy no app — deliberadamente isolado do login do painel da
// cooperativa (ver auth-empresa.ts). Hash de senha reaproveita o
// utilitário neutro em senha.ts (bcrypt é o mesmo pro sistema inteiro, só
// a sessão é que é separada).
export const SESSAO_MOTOBOY_COOKIE = "cl_sessao_motoboy";
const SESSAO_TTL_DIAS = 30;
const TOKEN_TTL_HORAS = 24;

export type SessaoMotoboy = {
  motoboyId: number;
  empresaId: number;
  nomeCompleto: string;
  email: string;
};

export async function criarSessaoMotoboy(motoboyId: number): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiraEm = new Date(Date.now() + SESSAO_TTL_DIAS * 24 * 60 * 60 * 1000);
  await prisma.sessaoMotoboy.create({ data: { token, motoboyId, expiraEm } });

  const cookieStore = await cookies();
  cookieStore.set(SESSAO_MOTOBOY_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiraEm,
    path: "/",
  });
  revalidatePath("/", "layout");
}

export async function destruirSessaoMotoboyAtual(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSAO_MOTOBOY_COOKIE)?.value;
  if (token) {
    await prisma.sessaoMotoboy.deleteMany({ where: { token } });
  }
  cookieStore.delete(SESSAO_MOTOBOY_COOKIE);
  revalidatePath("/", "layout");
}

export const getSessaoMotoboy = cache(
  async (): Promise<SessaoMotoboy | null> => {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSAO_MOTOBOY_COOKIE)?.value;
    if (!token) return null;

    const sessao = await prisma.sessaoMotoboy.findUnique({
      where: { token },
      select: {
        expiraEm: true,
        motoboy: {
          select: {
            id: true,
            empresaId: true,
            nomeCompleto: true,
            email: true,
            ativo: true,
            aprovadoEm: true,
          },
        },
      },
    });
    if (
      !sessao ||
      sessao.expiraEm < new Date() ||
      !sessao.motoboy.ativo ||
      sessao.motoboy.aprovadoEm === null
    ) {
      return null;
    }

    return {
      motoboyId: sessao.motoboy.id,
      empresaId: sessao.motoboy.empresaId,
      nomeCompleto: sessao.motoboy.nomeCompleto,
      email: sessao.motoboy.email,
    };
  }
);

/** Use no topo de toda page/action do app do motoboy. */
export async function requireMotoboy(): Promise<SessaoMotoboy> {
  const sessao = await getSessaoMotoboy();
  if (!sessao) redirect("/app/entrar");
  return sessao;
}

/** Cria um token de uso único (verificação de e-mail / recuperação de
 * senha), mesmo padrão de TokenAutenticacaoPessoa no extras-app. */
export async function criarTokenAutenticacaoMotoboy(
  motoboyId: number,
  tipo: "VERIFICACAO_EMAIL" | "RECUPERACAO_SENHA"
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiraEm = new Date(Date.now() + TOKEN_TTL_HORAS * 60 * 60 * 1000);
  await prisma.tokenAutenticacaoMotoboy.create({
    data: { token, motoboyId, tipo, expiraEm },
  });
  return token;
}

export type ResultadoTokenMotoboyValido =
  | { valido: true; motoboyId: number; tokenId: number }
  | { valido: false; motivo: "invalido" | "expirado" | "usado" };

/** Busca e valida um token (existe, tipo bate, não expirou, não foi
 * usado) sem marcá-lo como consumido — mesmo espírito de
 * buscarTokenValido no extras-app (src/lib/tokenAutenticacao.ts). */
export async function buscarTokenMotoboyValido(
  token: string,
  tipo: "VERIFICACAO_EMAIL" | "RECUPERACAO_SENHA"
): Promise<ResultadoTokenMotoboyValido> {
  const registro = await prisma.tokenAutenticacaoMotoboy.findUnique({ where: { token } });
  if (!registro || registro.tipo !== tipo) return { valido: false, motivo: "invalido" };
  if (registro.usadoEm !== null) return { valido: false, motivo: "usado" };
  if (registro.expiraEm < new Date()) return { valido: false, motivo: "expirado" };
  return { valido: true, motoboyId: registro.motoboyId, tokenId: registro.id };
}

/** Cooldown simples pra evitar spam de "reenviar" — mesmo espírito de
 * tokenRecenteExiste no extras-app. */
export async function tokenMotoboyRecenteExiste(
  motoboyId: number,
  tipo: "VERIFICACAO_EMAIL" | "RECUPERACAO_SENHA",
  minutosCooldown: number
): Promise<boolean> {
  const desde = new Date(Date.now() - minutosCooldown * 60 * 1000);
  const recente = await prisma.tokenAutenticacaoMotoboy.findFirst({
    where: {
      motoboyId,
      tipo,
      usadoEm: null,
      criadoEm: { gte: desde },
      expiraEm: { gt: new Date() },
    },
  });
  return recente !== null;
}

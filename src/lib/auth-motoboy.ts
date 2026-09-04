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
  /** null = ainda não escolheu cooperativa (ver comentário em
   * Motoboy.empresaId no schema) — quem usa isso precisa checar antes de
   * assumir que existe uma cooperativa de verdade. */
  empresaId: number | null;
  /** null = escolheu uma cooperativa mas ela ainda não aprovou. Só
   * relevante quando empresaId não é null. */
  aprovadoEm: Date | null;
  nomeCompleto: string;
  email: string;
  /** Motoboy promovido a Gestor de campo (ver Motoboy.ehGestor) — tem um
   * login de painel próprio pareado (Usuario.motoboyVinculadoId), com o
   * mesmo e-mail. Controla o acesso à tela "Minha equipe" e o modo de
   * remuneração das próprias bandas — não é sobre navegação, ver
   * temContaPainel pra isso. */
  ehGestor: boolean;
  /** true se esse e-mail também tem QUALQUER login de painel (dono,
   * gestor convidado ou Gestor de campo pareado — não importa o motivo,
   * são duas contas de verdade independentes, só compartilhando e-mail).
   * Usado pra mostrar o link fixo de trocar de tela em toda página do
   * app, não só uma vez no login. */
  temContaPainel: boolean;
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
            ehGestor: true,
          },
        },
      },
    });
    if (!sessao || sessao.expiraEm < new Date() || !sessao.motoboy.ativo) {
      return null;
    }

    const usuarioComMesmoEmail = await prisma.usuario.findFirst({
      where: { email: sessao.motoboy.email },
      select: { id: true },
    });

    return {
      motoboyId: sessao.motoboy.id,
      empresaId: sessao.motoboy.empresaId,
      aprovadoEm: sessao.motoboy.aprovadoEm,
      nomeCompleto: sessao.motoboy.nomeCompleto,
      email: sessao.motoboy.email,
      ehGestor: sessao.motoboy.ehGestor,
      temContaPainel: usuarioComMesmoEmail !== null,
    };
  }
);

/** Use no topo de toda page/action do app do motoboy. */
export async function requireMotoboy(): Promise<SessaoMotoboy> {
  const sessao = await getSessaoMotoboy();
  if (!sessao) redirect("/app/entrar");
  return sessao;
}

/** Use nas actions/pages que só fazem sentido com uma cooperativa de
 * verdade (turno, escala, relatório...) — tudo isso já fica escondido
 * atrás da tela de "escolher/aguardar cooperativa" no layout de
 * src/app/app/(logado)/layout.tsx, então empresaId aqui nunca deveria
 * ser null de verdade; o redirect é só uma rede de segurança. */
export async function requireMotoboyComEmpresa(): Promise<
  SessaoMotoboy & { empresaId: number }
> {
  const sessao = await requireMotoboy();
  if (sessao.empresaId === null) redirect("/app/inicio");
  return { ...sessao, empresaId: sessao.empresaId };
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

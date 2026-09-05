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
  nome: string;
  email: string;
  role: RoleUsuario;
  superAdmin: boolean;
  /** A cooperativa dona do login (sempre existe, mesmo pra superAdmin). */
  empresaHomeId: number;
  /** Só relevante pra superAdmin: qual cooperativa ele "entrou" agora. */
  empresaAtivaId: number | null;
  /** A cooperativa que toda page/action deveria usar — empresaAtivaId
   * quando superAdmin entrou em alguma, senão empresaHomeId. Só fica
   * null quando superAdmin ainda não entrou em nenhuma (aí a tela
   * certa é /master, não um painel de cooperativa nenhuma). */
  empresaEfetivoId: number | null;
  empresaEfetivoNome: string | null;
  /** Só preenchido pra role GESTOR_CAMPO — o Motoboy pareado a este
   * login (ver Usuario.motoboyVinculadoId). Usado pra filtrar dashboard/
   * escala/minha-equipe só pros clientes que ele é responsável. */
  motoboyVinculadoId: number | null;
  /** true se esse e-mail também tem QUALQUER login de motoboy (pareado
   * como Gestor de campo ou não — ex.: o próprio dono da cooperativa que
   * também se cadastrou como motoboy pra fazer entrega). Usado pra
   * mostrar o link fixo de trocar de tela em toda página do painel. */
  temContaMotoboy: boolean;
  /** Acesso à tela /financeiro — MASTER (ou superAdmin agindo como dono)
   * sempre tem, GESTOR/GESTOR_CAMPO só se Usuario.podeAcessarFinanceiro
   * tiver sido marcado (ver requireFinanceiro). */
  podeAcessarFinanceiro: boolean;
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
        empresaAtivaId: true,
        usuario: {
          select: {
            id: true,
            empresaId: true,
            nome: true,
            email: true,
            role: true,
            superAdmin: true,
            ativo: true,
            motoboyVinculadoId: true,
            podeAcessarFinanceiro: true,
          },
        },
        empresaAtiva: { select: { nome: true } },
      },
    });
    if (!sessao || sessao.expiraEm < new Date() || !sessao.usuario.ativo) {
      return null;
    }

    // Não-superAdmin sempre opera na própria cooperativa — empresaAtivaId
    // só existe de verdade pra quem pode "entrar" em cooperativa alheia.
    const empresaEfetivoId = sessao.usuario.superAdmin
      ? sessao.empresaAtivaId
      : sessao.usuario.empresaId;

    // Só preenchido quando o superAdmin está dentro de uma cooperativa
    // alheia — quem não é superAdmin já sabe o próprio nome de outro
    // jeito (o layout do painel busca a Empresa de qualquer forma).
    const empresaEfetivoNome =
      sessao.usuario.superAdmin && sessao.empresaAtiva ? sessao.empresaAtiva.nome : null;

    const motoboyComMesmoEmail = await prisma.motoboy.findFirst({
      where: { email: sessao.usuario.email },
      select: { id: true },
    });

    return {
      usuarioId: sessao.usuario.id,
      nome: sessao.usuario.nome,
      email: sessao.usuario.email,
      role: sessao.usuario.role,
      superAdmin: sessao.usuario.superAdmin,
      empresaHomeId: sessao.usuario.empresaId,
      empresaAtivaId: sessao.empresaAtivaId,
      empresaEfetivoId,
      empresaEfetivoNome,
      motoboyVinculadoId: sessao.usuario.motoboyVinculadoId,
      temContaMotoboy: motoboyComMesmoEmail !== null,
      podeAcessarFinanceiro:
        sessao.usuario.role === "MASTER" ||
        (sessao.usuario.superAdmin && sessao.empresaAtivaId !== null) ||
        sessao.usuario.podeAcessarFinanceiro,
    };
  }
);

/** Use só quando precisar saber "tem alguém logado?" sem exigir uma
 * cooperativa efetiva — ex.: o próprio /master, que é onde o superAdmin
 * vai antes de entrar em qualquer cooperativa. */
export async function requireEmpresa(): Promise<SessaoEmpresa> {
  const sessao = await getSessaoEmpresa();
  if (!sessao) redirect("/login");
  return sessao;
}

/** Use no topo de toda page/action do painel de UMA cooperativa
 * (dashboard, clientes, motoboys, pagamentos...). Se for superAdmin e
 * ainda não tiver entrado em nenhuma cooperativa, manda pra /master em
 * vez de deixar cair num painel sem empresa nenhuma. */
export async function requireTenant(): Promise<
  SessaoEmpresa & { empresaEfetivoId: number }
> {
  const sessao = await requireEmpresa();
  if (sessao.empresaEfetivoId === null) redirect("/master");
  return { ...sessao, empresaEfetivoId: sessao.empresaEfetivoId };
}

/** Use nas páginas/ações que um Gestor de campo NUNCA deveria ver
 * (clientes, motoboys, pagamentos, relatórios, turnos, escala da
 * semana...) — dashboard, escala (dia) e minha-equipe são as únicas
 * exceções, que usam requireTenant normal e filtram os dados por
 * clientesResponsaveisIds em vez de bloquear a página inteira. */
export async function requireTenantCompleto(): Promise<
  SessaoEmpresa & { empresaEfetivoId: number }
> {
  const sessao = await requireTenant();
  if (sessao.role === "GESTOR_CAMPO") redirect("/dashboard");
  return sessao;
}

/** IDs dos clientes que esse Gestor de campo é responsável (ver
 * MotoboyCliente.gestor) — lista vazia se não for GESTOR_CAMPO ou ainda
 * não tiver nenhum cliente atribuído. */
export async function clientesResponsaveisIds(
  sessao: Pick<SessaoEmpresa, "role" | "motoboyVinculadoId">
): Promise<number[]> {
  if (sessao.role !== "GESTOR_CAMPO" || sessao.motoboyVinculadoId === null) return [];
  const vinculos = await prisma.motoboyCliente.findMany({
    where: { motoboyId: sessao.motoboyVinculadoId, gestor: true },
    select: { clienteId: true },
  });
  return vinculos.map((v) => v.clienteId);
}

/** Use nas ações restritas ao dono (ex.: criar outro login, mexer em
 * valores padrão da cooperativa). Quando o superAdmin entrou numa
 * cooperativa alheia, ele age como se fosse o dono dela — é o próprio
 * propósito de "entrar como dono" (ver requireSuperAdmin pra quando o
 * que importa é a plataforma, não uma cooperativa específica). */
export async function requireMaster(): Promise<
  SessaoEmpresa & { empresaEfetivoId: number }
> {
  const sessao = await requireTenant();
  const agindoComoDonoPorSerSuperAdmin =
    sessao.superAdmin && sessao.empresaAtivaId !== null;
  if (sessao.role !== "MASTER" && !agindoComoDonoPorSerSuperAdmin) {
    redirect("/dashboard");
  }
  return sessao;
}

/** Use no topo de /financeiro e das actions de lá (valores a cobrar dos
 * clientes, notas fiscais de serviço, marcar como pago) — mais restrito
 * que requireTenantCompleto: só MASTER ou quem foi explicitamente
 * marcado com podeAcessarFinanceiro (ver convite/edição de membro da
 * equipe). GESTOR_CAMPO nunca tem, mesma regra de requireTenantCompleto. */
export async function requireFinanceiro(): Promise<
  SessaoEmpresa & { empresaEfetivoId: number }
> {
  const sessao = await requireTenantCompleto();
  if (!sessao.podeAcessarFinanceiro) redirect("/dashboard");
  return sessao;
}

/** Use no topo de /master e das ações que listam/entram em qualquer
 * cooperativa — diferente de requireMaster, que é sobre UMA cooperativa
 * específica, isso é sobre a plataforma inteira. */
export async function requireSuperAdmin(): Promise<SessaoEmpresa> {
  const sessao = await requireEmpresa();
  if (!sessao.superAdmin) redirect("/dashboard");
  return sessao;
}

/** SuperAdmin "entra" numa cooperativa — depois disso, empresaEfetivoId
 * passa a apontar pra ela em toda page/action, como se ele fosse o
 * MASTER dela. */
export async function entrarNaEmpresaComoSuperAdmin(empresaId: number): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSAO_EMPRESA_COOKIE)?.value;
  if (!token) return;
  await prisma.sessao.update({ where: { token }, data: { empresaAtivaId: empresaId } });
  revalidatePath("/", "layout");
}

/** Volta pra lista de cooperativas (/master) — limpa qual empresa
 * estava ativa, sem derrubar a sessão. */
export async function sairDaEmpresaAtiva(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSAO_EMPRESA_COOKIE)?.value;
  if (!token) return;
  await prisma.sessao.update({ where: { token }, data: { empresaAtivaId: null } });
  revalidatePath("/", "layout");
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
  criadoPorUsuarioId: number,
  podeAcessarFinanceiro: boolean = false
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiraEm = new Date(Date.now() + CONVITE_TTL_DIAS * 24 * 60 * 60 * 1000);
  await prisma.conviteEquipe.create({
    data: { empresaId, email, token, criadoPorUsuarioId, expiraEm, podeAcessarFinanceiro },
  });
  return token;
}

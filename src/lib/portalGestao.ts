import "server-only";
import { prisma } from "@/lib/prisma";

/** Resolve o Cliente pelo token do painel de GESTÃO (/gestao/[token]) —
 * espelha resolverClientePortal (src/lib/portal.ts), mas num token
 * separado (Cliente.tokenGestao), já que esse painel expõe histórico
 * completo por período (relatório com valor cobrado + escala), não só o
 * dia de hoje como o portal operacional da expedição. */
export async function resolverClienteGestao(token: string) {
  const cliente = await prisma.cliente.findUnique({ where: { tokenGestao: token } });
  if (!cliente || !cliente.ativo) return null;
  return cliente;
}

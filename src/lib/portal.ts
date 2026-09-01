import "server-only";
import { prisma } from "@/lib/prisma";

/** Resolve o Cliente pelo token da URL (/portal/[token]/...) — mesmo
 * padrão do Totem no extras-app: o link em si é a credencial, sem
 * login/senha. A cooperativa gera o token ao cadastrar o cliente e
 * manda o link pronto pra ele deixar aberto/salvo no navegador. */
export async function resolverClientePortal(token: string) {
  const cliente = await prisma.cliente.findUnique({ where: { tokenPortal: token } });
  if (!cliente || !cliente.ativo) return null;
  return cliente;
}

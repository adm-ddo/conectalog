"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolverClientePortal } from "@/lib/portal";

export type SolicitarApoioState = { erro?: string } | undefined;

export async function solicitarApoio(
  token: string,
  quantidade: number
): Promise<SolicitarApoioState> {
  const cliente = await resolverClientePortal(token);
  if (!cliente) return { erro: "Link inválido." };

  if (quantidade < 1 || quantidade > 3) {
    return { erro: "Só dá pra pedir de 1 a 3 motos de apoio." };
  }

  const jaTemPendente = await prisma.solicitacaoApoio.findFirst({
    where: { clienteId: cliente.id, status: "PENDENTE" },
  });
  if (jaTemPendente) {
    return { erro: "Já tem um pedido de apoio aguardando resposta da cooperativa." };
  }

  await prisma.solicitacaoApoio.create({
    data: { clienteId: cliente.id, quantidade },
  });

  redirect(`/portal/${token}/apoio`);
}

"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolverClientePortal } from "@/lib/portal";
import { valorEfetivo } from "@/lib/valores";

export type RegistrarChamadoIfoodState = { erro?: string } | undefined;

export type DadosChamadoIfood = {
  numeroPedidoSaipos: string;
  numeroPedidoIfood: string;
  valorIfood: number;
};

/** Registra um chamado de iFood feito pelo restaurante quando a
 * cooperativa não mandou moto suficiente — a diferença entre o que o
 * iFood cobrou e a banda normal desse cliente (nunca negativa) fica
 * guardada aqui pra ser abatida da cobrança da cooperativa no
 * fechamento do período (ver gerarRelatorioCliente/
 * gerarRelatorioGestaoCliente). */
export async function registrarChamadoIfood(
  token: string,
  dados: DadosChamadoIfood
): Promise<RegistrarChamadoIfoodState> {
  const cliente = await resolverClientePortal(token);
  if (!cliente) return { erro: "Link inválido." };

  const numeroPedidoSaipos = dados.numeroPedidoSaipos.trim();
  const numeroPedidoIfood = dados.numeroPedidoIfood.trim();
  if (!numeroPedidoSaipos || !numeroPedidoIfood) {
    return { erro: "Preencha o número do pedido Saipos e do pedido iFood." };
  }
  if (!(dados.valorIfood > 0)) {
    return { erro: "Informe o valor que o iFood cobrou." };
  }

  const empresa = await prisma.empresa.findUniqueOrThrow({ where: { id: cliente.empresaId } });
  const valorBandaClienteAplicado = valorEfetivo(cliente.valorBandaCliente, empresa.valorBandaClientePadrao);
  const valorDesconto = Math.max(0, dados.valorIfood - valorBandaClienteAplicado);

  await prisma.chamadoIfood.create({
    data: {
      clienteId: cliente.id,
      numeroPedidoSaipos,
      numeroPedidoIfood,
      valorIfood: dados.valorIfood,
      valorBandaClienteAplicado,
      valorDesconto,
    },
  });

  redirect(`/portal/${token}/ifood`);
}

"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolverClientePortal } from "@/lib/portal";

export type EncerrarPortalState = { erro?: string } | undefined;

export type DadosEncerrarPortal = {
  token: string;
  turnoId: number;
  quantidadeBandas: number;
  quantidadeTaxasExtras: number;
  nota: number;
  comentario: string;
};

/** Fechamento do turno do lado do cliente (restaurante) — bandas/taxas
 * que ELE viu acontecer + avaliação do motoboy. Guardado separado do
 * que o motoboy informou (Turno.quantidadeBandas); se os números não
 * baterem, o turno aparece na tela de divergências do painel da
 * cooperativa pra alguém resolver manualmente — decisão confirmada com
 * o Thiago: nenhum dos dois lados vale mais automaticamente. */
export async function encerrarPeloCliente(
  dados: DadosEncerrarPortal
): Promise<EncerrarPortalState> {
  const cliente = await resolverClientePortal(dados.token);
  if (!cliente) return { erro: "Link inválido." };

  const turno = await prisma.turno.findFirst({
    where: { id: dados.turnoId, clienteId: cliente.id },
  });
  if (!turno) return { erro: "Turno não encontrado." };

  if (dados.quantidadeBandas < 0 || dados.quantidadeTaxasExtras < 0) {
    return { erro: "Quantidade inválida." };
  }
  if (dados.nota < 1 || dados.nota > 5) {
    return { erro: "Selecione uma nota de 1 a 5." };
  }

  await prisma.$transaction([
    prisma.turno.update({
      where: { id: turno.id },
      data: {
        quantidadeBandasCliente: dados.quantidadeBandas,
        quantidadeTaxasExtrasCliente: dados.quantidadeTaxasExtras,
      },
    }),
    prisma.avaliacao.upsert({
      where: { turnoId: turno.id },
      update: { nota: dados.nota, comentario: dados.comentario.trim() || null },
      create: {
        turnoId: turno.id,
        clienteId: cliente.id,
        motoboyId: turno.motoboyId,
        nota: dados.nota,
        comentario: dados.comentario.trim() || null,
      },
    }),
  ]);

  redirect(`/portal/${dados.token}`);
}

"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolverClientePortal } from "@/lib/portal";
import type { Prisma } from "@/generated/prisma/client";

export type EncerrarPortalState = { erro?: string } | undefined;

export type DadosEncerrarPortal = {
  token: string;
  turnoId: number;
  quantidadeBandas: number;
  taxasExtras: { itemId: number; quantidade: number }[];
  nota: number;
  comentario: string;
  houveOcorrencia: boolean;
  descricaoOcorrencia: string;
  valorDesconto: number;
};

/** Fechamento do turno do lado do cliente (restaurante) — bandas/taxas
 * que ELE viu acontecer + avaliação do motoboy. Guardado separado do
 * que o motoboy informou (Turno.quantidadeBandas / TurnoTaxaExtraItem.
 * quantidade); se os números não baterem, o turno aparece na tela de
 * divergências do painel da cooperativa pra alguém resolver manualmente —
 * decisão confirmada com o Thiago: nenhum dos dois lados vale mais
 * automaticamente. Os itens de taxa extra já existem desde o início do
 * turno (ver turno/iniciar/actions.ts), então o cliente pode fechar aqui
 * antes ou depois do motoboy encerrar o turno dele. */
export async function encerrarPeloCliente(
  dados: DadosEncerrarPortal
): Promise<EncerrarPortalState> {
  const cliente = await resolverClientePortal(dados.token);
  if (!cliente) return { erro: "Link inválido." };

  const turno = await prisma.turno.findFirst({
    where: { id: dados.turnoId, clienteId: cliente.id },
    include: { taxaExtraItens: { select: { id: true } } },
  });
  if (!turno) return { erro: "Turno não encontrado." };

  if (dados.quantidadeBandas < 0) {
    return { erro: "Quantidade inválida." };
  }
  const idsValidos = new Set(turno.taxaExtraItens.map((item) => item.id));
  for (const item of dados.taxasExtras) {
    if (!idsValidos.has(item.itemId) || item.quantidade < 0) {
      return { erro: "Quantidade inválida." };
    }
  }
  if (dados.nota < 1 || dados.nota > 5) {
    return { erro: "Selecione uma nota de 1 a 5." };
  }
  if (dados.houveOcorrencia && !dados.descricaoOcorrencia.trim()) {
    return { erro: "Descreva o que aconteceu." };
  }
  if (dados.houveOcorrencia && dados.valorDesconto < 0) {
    return { erro: "Valor de desconto inválido." };
  }

  const totalTaxasExtras = dados.taxasExtras.reduce((soma, item) => soma + item.quantidade, 0);

  const operacoes: Prisma.PrismaPromise<unknown>[] = [
    prisma.turno.update({
      where: { id: turno.id },
      data: {
        quantidadeBandasCliente: dados.quantidadeBandas,
        quantidadeTaxasExtrasCliente: totalTaxasExtras,
      },
    }),
    ...dados.taxasExtras.map((item) =>
      prisma.turnoTaxaExtraItem.update({
        where: { id: item.itemId },
        data: { quantidadeCliente: item.quantidade },
      })
    ),
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
  ];

  // Ocorrência é um log + desconto real do que o motoboy recebe — feita
  // só quando ele já teve um problema de verdade nesse turno, então usa
  // upsert (o cliente pode voltar e corrigir a descrição/valor antes do
  // pagamento fechar) só quando marcado; não existe "remover ocorrência"
  // pelo portal de propósito — se for engano, quem resolve é a
  // cooperativa direto no painel.
  if (dados.houveOcorrencia) {
    operacoes.push(
      prisma.ocorrencia.upsert({
        where: { turnoId: turno.id },
        update: {
          descricao: dados.descricaoOcorrencia.trim(),
          valorDesconto: dados.valorDesconto,
        },
        create: {
          turnoId: turno.id,
          clienteId: cliente.id,
          motoboyId: turno.motoboyId,
          descricao: dados.descricaoOcorrencia.trim(),
          valorDesconto: dados.valorDesconto,
        },
      })
    );
  }

  await prisma.$transaction(operacoes);

  redirect(`/portal/${dados.token}`);
}

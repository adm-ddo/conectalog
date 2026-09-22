"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolverClientePortal } from "@/lib/portal";
import { PRAZO_CONFIRMACAO_MIN } from "@/lib/confirmacaoBandas";
import type { Prisma } from "@/generated/prisma/client";

export type EncerrarPortalState = { erro?: string } | undefined;

export type DadosEncerrarPortal = {
  token: string;
  turnoId: number;
  /// Sinal explícito e inequívoco de que o motoboy nunca esteve
  /// fisicamente presente — diferente de quantidadeBandas=0 (que pode só
  /// significar "esteve aqui e não fez nada"). Ver comentário em
  /// Turno.clienteMarcouAusente no schema. Quando true, o servidor
  /// ignora quantidadeBandas/quantidadeRetornos/taxasExtras vindos daqui
  /// e força tudo a 0 (defesa em profundidade).
  ausente: boolean;
  quantidadeBandas: number;
  quantidadeRetornos: number;
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
 * divergências do painel da cooperativa pra alguém resolver manualmente.
 * Cliente tem só PRAZO_CONFIRMACAO_CLIENTE_MIN depois do fim do turno pra
 * confirmar (ou corrigir uma confirmação já feita) — passado isso, vale
 * a contagem do motoboy até a cooperativa corrigir manualmente (decisão
 * revista com o Thiago: antes nenhum dos dois lados valia mais
 * automaticamente e não tinha prazo nenhum, o que deixava divergência
 * antiga reaparecendo do nada). Os itens de taxa extra já existem desde o
 * início do turno (ver turno/iniciar/actions.ts), então o cliente pode
 * fechar aqui antes ou depois do motoboy encerrar o turno dele — o prazo
 * só existe a partir do momento em que o turno de fato acaba
 * (turno.horaFim), então fechar cedo (turno ainda ABERTO) nunca esbarra
 * nele. */
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

  if (turno.horaFim) {
    const prazo = new Date(turno.horaFim.getTime() + PRAZO_CONFIRMACAO_MIN * 60_000);
    if (new Date() > prazo) {
      return {
        erro: "O prazo de 2 horas após o fim do turno pra confirmar já passou. Fale com a cooperativa se precisar corrigir.",
      };
    }
  }

  if (dados.quantidadeBandas < 0 || dados.quantidadeRetornos < 0) {
    return { erro: "Quantidade inválida." };
  }
  const idsValidos = new Set(turno.taxaExtraItens.map((item) => item.id));
  for (const item of dados.taxasExtras) {
    if (!idsValidos.has(item.itemId) || item.quantidade < 0) {
      return { erro: "Quantidade inválida." };
    }
  }
  // Sem nota pra dar quando o motoboy nunca esteve presente — não tem o
  // que avaliar.
  if (!dados.ausente && (dados.nota < 1 || dados.nota > 5)) {
    return { erro: "Selecione uma nota de 1 a 5." };
  }
  if (dados.houveOcorrencia && !dados.descricaoOcorrencia.trim()) {
    return { erro: "Descreva o que aconteceu." };
  }
  if (dados.houveOcorrencia && dados.valorDesconto < 0) {
    return { erro: "Valor de desconto inválido." };
  }

  // Ausente=true nunca confia nas quantidades vindas do cliente — força
  // tudo a 0, mesmo que o payload (por bug ou manipulação) venha com
  // algo diferente (ver Turno.clienteMarcouAusente no schema).
  const totalTaxasExtras = dados.ausente
    ? 0
    : dados.taxasExtras.reduce((soma, item) => soma + item.quantidade, 0);

  const operacoes: Prisma.PrismaPromise<unknown>[] = [
    prisma.turno.update({
      where: { id: turno.id },
      data: {
        quantidadeBandasCliente: dados.ausente ? 0 : dados.quantidadeBandas,
        quantidadeRetornosCliente: dados.ausente ? 0 : dados.quantidadeRetornos,
        quantidadeTaxasExtrasCliente: totalTaxasExtras,
        ...(dados.ausente ? { clienteMarcouAusente: true, clienteMarcouAusenteEm: new Date() } : {}),
      },
    }),
    ...turno.taxaExtraItens.map((item) =>
      prisma.turnoTaxaExtraItem.update({
        where: { id: item.id },
        data: {
          quantidadeCliente: dados.ausente
            ? 0
            : (dados.taxasExtras.find((t) => t.itemId === item.id)?.quantidade ?? 0),
        },
      })
    ),
  ];

  // Sem avaliação quando o motoboy nunca esteve presente — não tem
  // atendimento nenhum pra avaliar.
  if (!dados.ausente) {
    operacoes.push(
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
      })
    );
  }

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

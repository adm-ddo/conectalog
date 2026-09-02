"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth-empresa";

/** Fecha o pagamento de um grupo específico de turnos (um dia, se o
 * motoboy é DIARIA, ou uma semana, se é SEMANAL — ver agrupamento em
 * page.tsx) — o PIX em si a cooperativa faz pelo banco dela, isso aqui é
 * só o fechamento de conta. Mesmo espírito do extras-app: nunca calcula/
 * envia dinheiro sozinho.
 *
 * Todo desconto de ocorrência, vale E atraso (assiduidade) ainda pendente
 * do motoboy entra nesse fechamento (não só o do período do grupo): eles
 * não são amarrados a um turno específico pra fim de cobrança, então o
 * primeiro pagamento que a cooperativa fechar depois deles existirem é
 * quem absorve o desconto. */
export async function fecharPagamento(motoboyId: number, turnoIds: number[]) {
  const sessao = await requireTenant();

  const motoboy = await prisma.motoboy.findFirst({
    where: { id: motoboyId, empresaId: sessao.empresaEfetivoId },
  });
  if (!motoboy || turnoIds.length === 0) return;

  const [turnos, ocorrencias, vales, descontosAssiduidade] = await Promise.all([
    prisma.turno.findMany({
      where: { id: { in: turnoIds }, motoboyId, status: "CONCLUIDO", pagamentoId: null },
      include: { apoios: { where: { pagamentoId: null } } },
    }),
    prisma.ocorrencia.findMany({ where: { motoboyId, pagamentoId: null } }),
    prisma.vale.findMany({ where: { motoboyId, descontadoEm: null } }),
    prisma.descontoAssiduidade.findMany({ where: { motoboyId, pagamentoId: null } }),
  ]);
  if (turnos.length === 0) return;

  let valorTurnos = 0;
  let periodoInicio = turnos[0].horaInicio;
  let periodoFim = turnos[0].horaInicio;
  const turnoIdsReais: number[] = [];
  const apoioIds: number[] = [];

  for (const turno of turnos) {
    valorTurnos += Number(turno.valorTotal ?? 0);
    turnoIdsReais.push(turno.id);
    if (turno.horaInicio < periodoInicio) periodoInicio = turno.horaInicio;
    if (turno.horaInicio > periodoFim) periodoFim = turno.horaInicio;
    for (const apoio of turno.apoios) {
      valorTurnos += Number(apoio.valorTotal);
      apoioIds.push(apoio.id);
    }
  }

  const totalOcorrencias = ocorrencias.reduce((soma, o) => soma + Number(o.valorDesconto), 0);
  const totalVales = vales.reduce((soma, v) => soma + Number(v.valor), 0);
  const totalAssiduidade = descontosAssiduidade.reduce((soma, d) => soma + Number(d.valorDesconto), 0);
  const valorTotal = Math.max(0, valorTurnos - totalOcorrencias - totalVales - totalAssiduidade);
  const ocorrenciaIds = ocorrencias.map((o) => o.id);
  const valeIds = vales.map((v) => v.id);
  const descontoAssiduidadeIds = descontosAssiduidade.map((d) => d.id);

  await prisma.$transaction(async (tx) => {
    const pagamento = await tx.pagamento.create({
      data: { motoboyId, empresaId: sessao.empresaEfetivoId, periodoInicio, periodoFim, valorTotal },
    });
    await tx.turno.updateMany({
      where: { id: { in: turnoIdsReais } },
      data: { pagamentoId: pagamento.id },
    });
    if (apoioIds.length > 0) {
      await tx.apoio.updateMany({
        where: { id: { in: apoioIds } },
        data: { pagamentoId: pagamento.id },
      });
    }
    if (ocorrenciaIds.length > 0) {
      await tx.ocorrencia.updateMany({
        where: { id: { in: ocorrenciaIds } },
        data: { pagamentoId: pagamento.id },
      });
    }
    if (valeIds.length > 0) {
      await tx.vale.updateMany({
        where: { id: { in: valeIds } },
        data: { descontadoEm: new Date() },
      });
    }
    if (descontoAssiduidadeIds.length > 0) {
      await tx.descontoAssiduidade.updateMany({
        where: { id: { in: descontoAssiduidadeIds } },
        data: { pagamentoId: pagamento.id },
      });
    }
  });

  revalidatePath("/pagamentos");
}

export async function marcarPagamentoPago(pagamentoId: number) {
  const sessao = await requireTenant();

  const pagamento = await prisma.pagamento.findFirst({
    where: { id: pagamentoId, empresaId: sessao.empresaEfetivoId },
  });
  if (!pagamento) return;

  await prisma.$transaction([
    prisma.pagamento.update({
      where: { id: pagamentoId },
      data: { status: "CONCLUIDO", pagoEm: new Date() },
    }),
    prisma.turno.updateMany({ where: { pagamentoId }, data: { status: "PAGO" } }),
  ]);

  revalidatePath("/pagamentos");
}

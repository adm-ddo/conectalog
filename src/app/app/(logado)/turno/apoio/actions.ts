"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMotoboyComEmpresa } from "@/lib/auth-motoboy";
import { valorEfetivo, paraNumero } from "@/lib/valores";

// Apoio sempre usa o modelo "por banda" normal do cliente de apoio, nunca
// a diária/franquia — a diária representa a moto fixa contratada e
// parada o dia inteiro naquele cliente, o que não é o caso de um apoio
// pontual/oportunista em outro lugar.

export type ApoioState = { erro?: string } | undefined;

export type DadosApoio = {
  clienteId: number;
  quantidadeBandas: number;
  taxasExtras: { clienteTaxaExtraId: number; quantidade: number }[];
};

/** Apoio: sem foto/assinatura de propósito (decisão confirmada com o
 * Thiago) — só marca o cliente de apoio e a quantidade, pra não
 * atrapalhar o motoboy no meio da correria. */
export async function registrarApoio(dados: DadosApoio): Promise<ApoioState> {
  const sessao = await requireMotoboyComEmpresa();

  const turnoAberto = await prisma.turno.findFirst({
    where: { motoboyId: sessao.motoboyId, status: "ABERTO" },
  });
  if (!turnoAberto) return { erro: "Você precisa estar em turno pra registrar apoio." };

  const motoboy = await prisma.motoboy.findUniqueOrThrow({
    where: { id: sessao.motoboyId },
    select: { livre: true },
  });
  if (!motoboy.livre) {
    const liberacao = await prisma.motoboyCliente.findUnique({
      where: { motoboyId_clienteId: { motoboyId: sessao.motoboyId, clienteId: dados.clienteId } },
    });
    if (!liberacao?.liberado) {
      return { erro: "Você não está liberado pra dar apoio nesse cliente." };
    }
  }

  const [cliente, empresa] = await Promise.all([
    prisma.cliente.findFirst({
      where: { id: dados.clienteId, empresaId: sessao.empresaId, ativo: true },
      include: { taxasExtras: true },
    }),
    prisma.empresa.findUniqueOrThrow({ where: { id: sessao.empresaId } }),
  ]);
  if (!cliente) return { erro: "Cliente inválido." };

  // Nunca confia no valor de taxa extra vindo do app — só a quantidade é
  // do motoboy, a faixa/valor de verdade é a cadastrada agora no Cliente.
  const itensTaxaExtra = cliente.taxasExtras.map((faixa) => ({
    clienteTaxaExtraId: faixa.id,
    ordem: faixa.ordem,
    descricao: faixa.descricao,
    valorMotoboyAplicado: faixa.valorMotoboy,
    valorClienteAplicado: faixa.valorCliente,
    quantidade: dados.taxasExtras.find((t) => t.clienteTaxaExtraId === faixa.id)?.quantidade ?? 0,
  }));
  const totalTaxasExtras = itensTaxaExtra.reduce((soma, item) => soma + item.quantidade, 0);

  if (dados.quantidadeBandas <= 0 && totalTaxasExtras <= 0) {
    return { erro: "Marque ao menos uma banda ou taxa extra." };
  }

  // Sempre "por banda" normal, nunca a diária (ver comentário no topo do
  // arquivo) — por isso não usa calcularValores, que ligaria o modelo de
  // diária se o Cliente tiver esse preço configurado pro turno principal.
  const valorBandaAplicado = valorEfetivo(cliente.valorBandaMotoboy, empresa.valorBandaMotoboyPadrao);
  const valorBandaClienteAplicado = valorEfetivo(cliente.valorBandaCliente, empresa.valorBandaClientePadrao);
  const somaTaxaMotoboy = itensTaxaExtra.reduce(
    (soma, item) => soma + item.quantidade * paraNumero(item.valorMotoboyAplicado),
    0
  );
  const somaTaxaCliente = itensTaxaExtra.reduce(
    (soma, item) => soma + item.quantidade * paraNumero(item.valorClienteAplicado),
    0
  );
  const valorTotal = dados.quantidadeBandas * valorBandaAplicado + somaTaxaMotoboy;
  const valorCobradoCliente = dados.quantidadeBandas * valorBandaClienteAplicado + somaTaxaCliente;

  const apoio = await prisma.apoio.create({
    data: {
      turnoId: turnoAberto.id,
      clienteId: dados.clienteId,
      quantidadeBandas: dados.quantidadeBandas,
      quantidadeTaxasExtras: totalTaxasExtras,
      valorBandaAplicado,
      valorTotal,
      valorCobradoCliente,
    },
  });

  if (itensTaxaExtra.length > 0) {
    await prisma.apoioTaxaExtraItem.createMany({
      data: itensTaxaExtra.map((item) => ({ ...item, apoioId: apoio.id })),
    });
  }

  redirect("/app/inicio");
}

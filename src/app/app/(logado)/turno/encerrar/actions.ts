"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMotoboyComEmpresa } from "@/lib/auth-motoboy";
import { uploadDataUrl } from "@/lib/blob";
import { valorEfetivo, paraNumero } from "@/lib/valores";
import { calcularValores, encontrarPerfilFixo, aplicarRemuneracaoGestor } from "@/lib/precificacao";
import { diaSemanaBrasil } from "@/lib/data";
import type { Prisma } from "@/generated/prisma/client";

export type EncerrarTurnoState = { erro?: string } | undefined;

export type DadosEncerrarTurno = {
  quantidadeBandas: number;
  taxasExtras: { itemId: number; quantidade: number }[];
  fotoFimDataUrl: string;
  assinaturaReciboDataUrl: string;
  nota: number;
  comentario: string;
};

export async function encerrarTurno(dados: DadosEncerrarTurno): Promise<EncerrarTurnoState> {
  const sessao = await requireMotoboyComEmpresa();

  // taxaExtraItens já existe desde o início do turno (um item por faixa
  // do Cliente naquele momento, com o preço já travado) — aqui só marca
  // a quantidade que o motoboy informou em cada um.
  const turno = await prisma.turno.findFirst({
    where: { motoboyId: sessao.motoboyId, status: "ABERTO" },
    include: { cliente: { include: { turnosFixos: true } }, taxaExtraItens: true },
  });
  if (!turno) return { erro: "Nenhum turno em aberto." };

  const itensComQuantidade = turno.taxaExtraItens.map((item) => ({
    id: item.id,
    valorMotoboyAplicado: item.valorMotoboyAplicado,
    valorClienteAplicado: item.valorClienteAplicado,
    quantidade: dados.taxasExtras.find((t) => t.itemId === item.id)?.quantidade ?? 0,
  }));
  const totalTaxasExtras = itensComQuantidade.reduce((soma, item) => soma + item.quantidade, 0);

  if (dados.quantidadeBandas <= 0 && totalTaxasExtras <= 0) {
    return { erro: "Marque quantas bandas você fez." };
  }
  if (!dados.fotoFimDataUrl || !dados.assinaturaReciboDataUrl) {
    return { erro: "Falta a foto ou a assinatura do recibo." };
  }
  if (dados.nota < 1 || dados.nota > 5) {
    return { erro: "Selecione uma nota de 1 a 5 pra avaliar a empresa." };
  }

  const [empresa, motoboy] = await Promise.all([
    prisma.empresa.findUniqueOrThrow({ where: { id: sessao.empresaId } }),
    prisma.motoboy.findUniqueOrThrow({
      where: { id: sessao.motoboyId },
      select: { ehGestor: true, modoRemuneracaoGestor: true, valorBandaGestorEspecial: true },
    }),
  ]);
  const { valorMotoboy, valorCliente } = calcularValores(
    turno.cliente,
    empresa,
    turno.horaInicio,
    turno.turnoPredefinido,
    dados.quantidadeBandas,
    itensComQuantidade.map((item) => ({
      valorMotoboy: item.valorMotoboyAplicado,
      valorCliente: item.valorClienteAplicado,
      quantidade: item.quantidade,
    }))
  );
  // A cobrança do cliente nunca muda; só o quanto o Gestor recebe pelas
  // PRÓPRIAS bandas pode seguir uma regra diferente da tarifa normal.
  const totalTaxasMotoboy = itensComQuantidade.reduce(
    (soma, item) => soma + item.quantidade * paraNumero(item.valorMotoboyAplicado),
    0
  );
  const valorMotoboyFinal =
    aplicarRemuneracaoGestor(valorMotoboy - totalTaxasMotoboy, dados.quantidadeBandas, motoboy) +
    totalTaxasMotoboy;
  // Snapshot informativo do valor por banda em vigor — no valor fixo por
  // turno, é a tarifa de excedente do perfil que bateu (a única que de
  // fato varia com a quantidade).
  const perfilFixo =
    turno.turnoPredefinido !== "LIVRE"
      ? encontrarPerfilFixo(turno.cliente.turnosFixos, turno.turnoPredefinido, diaSemanaBrasil(turno.horaInicio))
      : null;
  const valorBandaAplicado = perfilFixo
    ? paraNumero(perfilFixo.valorExcedenteMotoboy)
    : valorEfetivo(turno.cliente.valorBandaMotoboy, empresa.valorBandaMotoboyPadrao);

  const [fotoFimUrl, assinaturaReciboUrl] = await Promise.all([
    uploadDataUrl(`turnos/foto-fim-${Date.now()}.jpg`, dados.fotoFimDataUrl),
    uploadDataUrl(`turnos/assinatura-recibo-${Date.now()}.png`, dados.assinaturaReciboDataUrl),
  ]);

  const operacoes: Prisma.PrismaPromise<unknown>[] = [
    prisma.turno.update({
      where: { id: turno.id },
      data: {
        horaFim: new Date(),
        fotoFimUrl,
        assinaturaReciboUrl,
        quantidadeBandas: dados.quantidadeBandas,
        quantidadeTaxasExtras: totalTaxasExtras,
        valorBandaAplicado,
        valorTotal: valorMotoboyFinal,
        valorCobradoCliente: valorCliente,
        status: "CONCLUIDO",
      },
    }),
    ...itensComQuantidade.map((item) =>
      prisma.turnoTaxaExtraItem.update({
        where: { id: item.id },
        data: { quantidade: item.quantidade },
      })
    ),
    prisma.avaliacaoCliente.create({
      data: {
        turnoId: turno.id,
        clienteId: turno.clienteId,
        motoboyId: sessao.motoboyId,
        nota: dados.nota,
        comentario: dados.comentario.trim() || null,
      },
    }),
  ];
  await prisma.$transaction(operacoes);

  redirect(`/app/turno/resumo/${turno.id}`);
}

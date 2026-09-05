"use server";

import { revalidatePath } from "next/cache";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requireFinanceiro } from "@/lib/auth-empresa";
import { gerarRelatorioCliente } from "@/lib/relatorios";
import { RelatorioPdfDocument } from "@/lib/relatorioClientePdf";
import { enviarEmailFaturaCliente } from "@/lib/email";
import { formatarMoeda } from "@/lib/valores";

export type GerarFaturaState = { erro?: string } | undefined;

/** Cria (ou recalcula, se já existir pro mesmo período) a nota fiscal de
 * serviço de um cliente — snapshot dos valores de agora; se os turnos do
 * período mudarem depois (ex.: correção de fechamento automático), gerar
 * de novo atualiza os números antes de mandar. */
export async function gerarOuAtualizarFatura(
  clienteId: number,
  periodoInicio: string,
  periodoFim: string
): Promise<GerarFaturaState> {
  const sessao = await requireFinanceiro();

  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, empresaId: sessao.empresaEfetivoId },
  });
  if (!cliente) return { erro: "Cliente não encontrado." };

  const relatorio = await gerarRelatorioCliente(sessao.empresaEfetivoId, clienteId, periodoInicio, periodoFim);
  if (!relatorio) return { erro: "Cliente não encontrado." };

  await prisma.faturaCliente.upsert({
    where: {
      clienteId_periodoInicio_periodoFim: {
        clienteId,
        periodoInicio: new Date(periodoInicio),
        periodoFim: new Date(periodoFim),
      },
    },
    update: { valorTotal: relatorio.valorTotalCliente, totalBandas: relatorio.totalBandas },
    create: {
      clienteId,
      empresaId: sessao.empresaEfetivoId,
      periodoInicio: new Date(periodoInicio),
      periodoFim: new Date(periodoFim),
      valorTotal: relatorio.valorTotalCliente,
      totalBandas: relatorio.totalBandas,
    },
  });

  revalidatePath("/financeiro");
  revalidatePath(`/financeiro/${clienteId}`);
}

/** Manda a nota fiscal (PDF) pro contato financeiro do Cliente e marca a
 * fatura como ENVIADA — nunca automático, sempre um clique explícito da
 * cooperativa (decisão confirmada com o Thiago: evita mandar valor
 * errado sem ninguém ter revisado antes). */
export async function enviarFatura(faturaId: number): Promise<GerarFaturaState> {
  const sessao = await requireFinanceiro();

  const fatura = await prisma.faturaCliente.findFirst({
    where: { id: faturaId, empresaId: sessao.empresaEfetivoId },
    include: { cliente: true, empresa: { select: { nome: true } } },
  });
  if (!fatura) return { erro: "Fatura não encontrada." };
  if (!fatura.cliente.contatoFinanceiroEmail) {
    return { erro: "Cadastre o e-mail do contato financeiro desse cliente antes de enviar." };
  }

  const dataInicioISO = fatura.periodoInicio.toISOString().slice(0, 10);
  const dataFimISO = fatura.periodoFim.toISOString().slice(0, 10);
  const relatorio = await gerarRelatorioCliente(sessao.empresaEfetivoId, fatura.clienteId, dataInicioISO, dataFimISO);
  if (!relatorio) return { erro: "Cliente não encontrado." };

  const pdfBuffer = await renderToBuffer(
    <RelatorioPdfDocument relatorio={relatorio} titulo="Nota fiscal de serviço" />
  );
  const nomeArquivo = `nota-fiscal-${fatura.cliente.nome.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${dataInicioISO}-a-${dataFimISO}.pdf`;

  const resultado = await enviarEmailFaturaCliente({
    destinatario: fatura.cliente.contatoFinanceiroEmail,
    nomeContato: fatura.cliente.contatoFinanceiroNome || fatura.cliente.contatoFinanceiroEmail,
    nomeCliente: fatura.cliente.nome,
    nomeCooperativa: fatura.empresa.nome,
    periodoInicio: dataInicioISO,
    periodoFim: dataFimISO,
    valorTotal: formatarMoeda(relatorio.valorTotalCliente),
    pdfBuffer: Buffer.from(pdfBuffer),
    nomeArquivo,
  });
  if (!resultado.sucesso) return { erro: "Falha ao enviar o e-mail — tenta de novo em instantes." };

  await prisma.faturaCliente.update({
    where: { id: faturaId },
    data: { status: "ENVIADA", enviadaEm: new Date() },
  });

  revalidatePath("/financeiro");
  revalidatePath(`/financeiro/${fatura.clienteId}`);
}

export async function marcarFaturaPaga(faturaId: number) {
  const sessao = await requireFinanceiro();
  await prisma.faturaCliente.updateMany({
    where: { id: faturaId, empresaId: sessao.empresaEfetivoId },
    data: { status: "PAGA", pagaEm: new Date() },
  });
  revalidatePath("/financeiro");
}

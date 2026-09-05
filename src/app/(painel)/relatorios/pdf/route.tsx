import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireTenantCompleto } from "@/lib/auth-empresa";
import { gerarRelatorioCliente } from "@/lib/relatorios";
import { RelatorioPdfDocument } from "@/lib/relatorioClientePdf";

export async function GET(request: NextRequest) {
  const sessao = await requireTenantCompleto();
  const { searchParams } = new URL(request.url);

  const clienteId = Number(searchParams.get("clienteId"));
  const inicio = searchParams.get("inicio");
  const fim = searchParams.get("fim");
  if (!clienteId || !inicio || !fim) {
    return NextResponse.json({ erro: "Parâmetros inválidos." }, { status: 400 });
  }

  const relatorio = await gerarRelatorioCliente(sessao.empresaEfetivoId, clienteId, inicio, fim);
  if (!relatorio) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }

  const buffer = await renderToBuffer(<RelatorioPdfDocument relatorio={relatorio} />);
  const nomeArquivo = `relatorio-${relatorio.clienteNome.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${inicio}-a-${fim}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}

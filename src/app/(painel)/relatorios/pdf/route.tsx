import { NextRequest, NextResponse } from "next/server";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { requireTenantCompleto } from "@/lib/auth-empresa";
import { gerarRelatorioCliente, type RelatorioCliente } from "@/lib/relatorios";
import { formatarMoeda } from "@/lib/valores";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  titulo: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  subtitulo: { fontSize: 10, color: "#57534e", marginBottom: 16 },
  resumo: { flexDirection: "row", gap: 16, marginBottom: 16 },
  resumoBox: { flex: 1, border: "1pt solid #e7e5e4", borderRadius: 8, padding: 10 },
  resumoLabel: { fontSize: 8, color: "#78716c", textTransform: "uppercase", marginBottom: 2 },
  resumoValor: { fontSize: 14, fontWeight: 700 },
  aviso: { fontSize: 9, color: "#b45309", backgroundColor: "#fffbeb", padding: 6, borderRadius: 4, marginBottom: 12 },
  linhaCabecalho: {
    flexDirection: "row",
    borderBottom: "1pt solid #d6d3d1",
    paddingBottom: 4,
    marginBottom: 4,
    fontWeight: 700,
    fontSize: 9,
    color: "#44403c",
  },
  linha: {
    flexDirection: "row",
    borderBottom: "0.5pt solid #e7e5e4",
    paddingVertical: 5,
  },
  colNome: { flex: 3 },
  colNum: { flex: 1.4, textAlign: "right" },
  colStatus: { flex: 1.6, textAlign: "right" },
  detalhe: { fontSize: 8.5, color: "#7f1d1d", marginTop: 2 },
  detalheVale: { fontSize: 8.5, color: "#57534e", marginTop: 2 },
});

const LABEL_STATUS: Record<string, string> = {
  PAGO: "Pago",
  PARCIAL: "Parcial",
  PENDENTE: "Pendente",
  SEM_ATENDIMENTO: "—",
};

function RelatorioPdfDocument({ relatorio }: { relatorio: RelatorioCliente }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.titulo}>{relatorio.clienteNome}</Text>
        <Text style={styles.subtitulo}>
          Período de {relatorio.dataInicio.split("-").reverse().join("/")} até{" "}
          {relatorio.dataFim.split("-").reverse().join("/")}
        </Text>

        <View style={styles.resumo}>
          <View style={styles.resumoBox}>
            <Text style={styles.resumoLabel}>Total a pagar</Text>
            <Text style={styles.resumoValor}>R$ {formatarMoeda(relatorio.valorTotalCliente)}</Text>
          </View>
          <View style={styles.resumoBox}>
            <Text style={styles.resumoLabel}>Bandas no período</Text>
            <Text style={styles.resumoValor}>{relatorio.totalBandas}</Text>
          </View>
          <View style={styles.resumoBox}>
            <Text style={styles.resumoLabel}>Motoboys</Text>
            <Text style={styles.resumoValor}>{relatorio.motoboys.length}</Text>
          </View>
        </View>

        {relatorio.turnosAbertosNaoIncluidos > 0 && (
          <Text style={styles.aviso}>
            {relatorio.turnosAbertosNaoIncluidos} turno(s) ainda em aberto nesse período não entraram
            nesses números.
          </Text>
        )}

        <View style={styles.linhaCabecalho}>
          <Text style={styles.colNome}>Motoboy</Text>
          <Text style={styles.colNum}>Bandas</Text>
          <Text style={styles.colNum}>Ele recebe</Text>
          <Text style={styles.colNum}>Cliente paga</Text>
          <Text style={styles.colStatus}>Status</Text>
        </View>

        {relatorio.motoboys.length === 0 ? (
          <Text style={{ fontSize: 10, color: "#78716c", marginTop: 8 }}>
            Nenhum atendimento encontrado nesse período.
          </Text>
        ) : (
          relatorio.motoboys.map((m) => (
            <View key={m.motoboyId} wrap={false}>
              <View style={styles.linha}>
                <Text style={styles.colNome}>{m.nome}</Text>
                <Text style={styles.colNum}>{m.bandas}</Text>
                <Text style={styles.colNum}>R$ {formatarMoeda(m.valorRecebe)}</Text>
                <Text style={styles.colNum}>R$ {formatarMoeda(m.valorCliente)}</Text>
                <Text style={styles.colStatus}>{LABEL_STATUS[m.statusPagamento]}</Text>
              </View>
              {m.vales.map((v) => (
                <Text key={`vale-${v.id}`} style={styles.detalheVale}>
                  Vale de {new Date(v.data).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} —
                  R$ {formatarMoeda(v.valor)}
                  {v.observacao ? ` (${v.observacao})` : ""} —{" "}
                  {v.descontado ? "já descontado" : "ainda não descontado"}
                </Text>
              ))}
              {m.ocorrencias.map((o) => (
                <Text key={`oco-${o.id}`} style={styles.detalhe}>
                  Ocorrência: {o.descricao} — R$ {formatarMoeda(o.valor)} —{" "}
                  {o.descontado ? "já descontado" : "ainda não descontado"}
                </Text>
              ))}
              {m.descontosAssiduidade.map((d) => (
                <Text key={`atr-${d.id}`} style={styles.detalhe}>
                  Atraso de {d.minutosAtraso} min — R$ {formatarMoeda(d.valor)} —{" "}
                  {d.descontado ? "já descontado" : "ainda não descontado"}
                </Text>
              ))}
            </View>
          ))
        )}
      </Page>
    </Document>
  );
}

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

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireFinanceiro } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { formatarMoeda } from "@/lib/valores";
import { formatarDataHora } from "@/lib/data";
import { gerarRelatorioCliente } from "@/lib/relatorios";
import { semanaAnteriorCompleta, resolverContatoFinanceiro } from "@/lib/financeiro";
import BotaoVoltar from "@/components/BotaoVoltar";
import FaturaAcoes from "./FaturaAcoes";

const LABEL_STATUS: Record<string, string> = {
  PAGO: "Pago",
  PARCIAL: "Parcial",
  PENDENTE: "Pendente",
  SEM_ATENDIMENTO: "—",
};
const COR_STATUS: Record<string, string> = {
  PAGO: "bg-brand-100 text-brand-800",
  PARCIAL: "bg-amber-100 text-amber-800",
  PENDENTE: "bg-red-100 text-red-700",
  SEM_ATENDIMENTO: "bg-stone-100 text-stone-500",
};

export default async function FinanceiroClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ clienteId: string }>;
  searchParams: Promise<{ inicio?: string; fim?: string }>;
}) {
  const sessao = await requireFinanceiro();
  const clienteId = Number((await params).clienteId);
  const sp = await searchParams;

  const [cliente, empresa] = await Promise.all([
    prisma.cliente.findFirst({ where: { id: clienteId, empresaId: sessao.empresaEfetivoId } }),
    prisma.empresa.findUniqueOrThrow({
      where: { id: sessao.empresaEfetivoId },
      select: { diaInicioSemanaFinanceira: true },
    }),
  ]);
  if (!cliente) notFound();

  const semanaPassada = semanaAnteriorCompleta(empresa.diaInicioSemanaFinanceira);
  const periodoInicio = sp.inicio || semanaPassada.inicio;
  const periodoFim = sp.fim || semanaPassada.fim;

  const [relatorio, fatura] = await Promise.all([
    gerarRelatorioCliente(sessao.empresaEfetivoId, clienteId, periodoInicio, periodoFim),
    prisma.faturaCliente.findUnique({
      where: {
        clienteId_periodoInicio_periodoFim: {
          clienteId,
          periodoInicio: new Date(periodoInicio),
          periodoFim: new Date(periodoFim),
        },
      },
    }),
  ]);
  if (!relatorio) notFound();

  const contatoFinanceiro = resolverContatoFinanceiro(cliente);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <BotaoVoltar />
        <h1 className="text-2xl font-semibold text-navy-900 mt-1">{cliente.nome}</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Nota fiscal de serviço — {periodoInicio.split("-").reverse().join("/")} até{" "}
          {periodoFim.split("-").reverse().join("/")}
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">De</span>
          <input
            type="date"
            name="inicio"
            defaultValue={periodoInicio}
            className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Até</span>
          <input
            type="date"
            name="fim"
            defaultValue={periodoFim}
            className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          Ver
        </button>
      </form>

      {!contatoFinanceiro && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Esse cliente ainda não tem e-mail de contato financeiro (nem operacional) cadastrado —{" "}
          <Link href={`/clientes/${clienteId}`} className="underline font-medium">
            cadastre na página dele
          </Link>{" "}
          antes de enviar a nota fiscal.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">Total a pagar</p>
          <p className="text-2xl font-bold text-navy-900 mt-1">R$ {formatarMoeda(relatorio.valorTotalCliente)}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">Bandas</p>
          <p className="text-2xl font-bold text-navy-900 mt-1">{relatorio.totalBandas}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">Motos</p>
          <p className="text-2xl font-bold text-navy-900 mt-1">{relatorio.motoboys.length}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">Escaladas</p>
          <p className="text-2xl font-bold text-navy-900 mt-1">{relatorio.totalEscalas}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">Confirmaram</p>
          <p className="text-2xl font-bold text-navy-900 mt-1">{relatorio.totalConfirmados}</p>
        </div>
      </div>

      {relatorio.turnosAbertosNaoIncluidos > 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {relatorio.turnosAbertosNaoIncluidos} turno
          {relatorio.turnosAbertosNaoIncluidos > 1 ? "s" : ""} ainda em aberto nesse período não{" "}
          {relatorio.turnosAbertosNaoIncluidos > 1 ? "entraram" : "entrou"} nesses números.
        </p>
      )}

      <FaturaAcoes
        clienteId={clienteId}
        periodoInicio={periodoInicio}
        periodoFim={periodoFim}
        fatura={
          fatura
            ? {
                id: fatura.id,
                status: fatura.status,
                enviadaEm: fatura.enviadaEm ? formatarDataHora(fatura.enviadaEm) : null,
                pagaEm: fatura.pagaEm ? formatarDataHora(fatura.pagaEm) : null,
                valorTotalMudou: Number(fatura.valorTotal) !== relatorio.valorTotalCliente,
              }
            : null
        }
        temContatoFinanceiro={!!contatoFinanceiro}
        pdfHref={`/relatorios/pdf?clienteId=${clienteId}&inicio=${periodoInicio}&fim=${periodoFim}`}
      />

      {relatorio.motoboys.length > 0 && (
        <ul className="flex flex-col gap-2">
          {relatorio.motoboys.map((m) => (
            <li
              key={m.motoboyId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3"
            >
              <Link href={`/motoboys/${m.motoboyId}`} className="text-sm font-semibold text-navy-900 hover:underline">
                {m.nome}
              </Link>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-stone-500">{m.bandas} bandas</span>
                <span className="font-medium text-navy-900">R$ {formatarMoeda(m.valorCliente)}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${COR_STATUS[m.statusPagamento]}`}>
                  {LABEL_STATUS[m.statusPagamento]}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


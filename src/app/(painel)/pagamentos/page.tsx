import { requireEmpresa } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { formatarMoeda } from "@/lib/valores";
import PendenciaRow from "./PendenciaRow";
import PagamentoRow from "./PagamentoRow";

export default async function PagamentosPage() {
  const sessao = await requireEmpresa();

  const [motoboys, pagamentos] = await Promise.all([
    prisma.motoboy.findMany({
      where: { empresaId: sessao.empresaId, ativo: true },
      orderBy: { nomeCompleto: "asc" },
      select: {
        id: true,
        nomeCompleto: true,
        turnos: {
          where: { status: "CONCLUIDO", pagamentoId: null },
          select: {
            valorTotal: true,
            apoios: { where: { pagamentoId: null }, select: { valorTotal: true } },
          },
        },
      },
    }),
    prisma.pagamento.findMany({
      where: { empresaId: sessao.empresaId },
      orderBy: { criadoEm: "desc" },
      include: { motoboy: { select: { nomeCompleto: true } } },
    }),
  ]);

  const pendencias = motoboys
    .map((m) => {
      let total = 0;
      for (const t of m.turnos) {
        total += Number(t.valorTotal ?? 0);
        for (const a of t.apoios) total += Number(a.valorTotal);
      }
      return { id: m.id, nome: m.nomeCompleto, total, quantidadeTurnos: m.turnos.length };
    })
    .filter((p) => p.quantidadeTurnos > 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Pagamentos</h1>
        <p className="text-stone-600 mt-1 text-sm">
          O PIX ainda é feito por você pelo banco — aqui é só o controle de quem já foi pago.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-navy-900 mb-3">A fechar</h2>
        {pendencias.length === 0 ? (
          <p className="text-sm text-stone-500">
            Nenhum turno concluído esperando fechamento no momento.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pendencias.map((p) => (
              <PendenciaRow
                key={p.id}
                motoboyId={p.id}
                nome={p.nome}
                quantidadeTurnos={p.quantidadeTurnos}
                total={formatarMoeda(p.total)}
              />
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-navy-900 mb-3">Histórico</h2>
        {pagamentos.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhum pagamento fechado ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pagamentos.map((p) => (
              <PagamentoRow
                key={p.id}
                pagamento={{
                  id: p.id,
                  nomeMotoboy: p.motoboy.nomeCompleto,
                  periodoInicio: p.periodoInicio.toLocaleDateString("pt-BR"),
                  periodoFim: p.periodoFim.toLocaleDateString("pt-BR"),
                  valorTotal: formatarMoeda(p.valorTotal),
                  status: p.status,
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

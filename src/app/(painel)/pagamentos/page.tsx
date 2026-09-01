import { requireEmpresa } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { formatarMoeda } from "@/lib/valores";

export default async function PagamentosPage() {
  const sessao = await requireEmpresa();

  const pagamentos = await prisma.pagamento.findMany({
    where: { empresaId: sessao.empresaId },
    orderBy: { criadoEm: "desc" },
    include: { motoboy: { select: { nomeCompleto: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Pagamentos</h1>
        <p className="text-stone-600 mt-1 text-sm">
          O PIX ainda é feito por você pelo banco — aqui é só o controle de quem já foi pago.
        </p>
      </div>

      {pagamentos.length === 0 ? (
        <p className="text-stone-500 text-sm">
          Nenhum pagamento gerado ainda. Isso aparece aqui assim que houver turnos concluídos pra
          fechar.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {pagamentos.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3"
            >
              <div className="min-w-0 flex flex-col">
                <span className="text-sm font-semibold text-navy-900 truncate">
                  {p.motoboy.nomeCompleto}
                </span>
                <span className="text-xs text-stone-500">
                  {p.periodoInicio.toLocaleDateString("pt-BR")} –{" "}
                  {p.periodoFim.toLocaleDateString("pt-BR")} · R$ {formatarMoeda(p.valorTotal)}
                </span>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                  p.status === "CONCLUIDO"
                    ? "bg-brand-100 text-brand-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {p.status === "CONCLUIDO" ? "Pago" : "Pendente"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

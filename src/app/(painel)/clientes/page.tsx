import { requireEmpresa } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { formatarMoeda, valorEfetivo } from "@/lib/valores";
import ClienteRow from "./ClienteRow";
import NovoClienteForm from "./NovoClienteForm";

export default async function ClientesPage() {
  const sessao = await requireEmpresa();

  const [empresa, clientes] = await Promise.all([
    prisma.empresa.findUniqueOrThrow({
      where: { id: sessao.empresaId },
      select: { valorBandaPadrao: true, valorTaxaExtraPadrao: true },
    }),
    prisma.cliente.findMany({
      where: { empresaId: sessao.empresaId },
      orderBy: { nome: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Clientes</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Empresas atendidas pela cooperativa — cada uma pode ter seu próprio valor de banda e
          taxa extra.
        </p>
      </div>

      {clientes.length === 0 ? (
        <p className="text-stone-500 text-sm">Nenhum cliente cadastrado ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {clientes.map((cliente) => (
            <ClienteRow
              key={cliente.id}
              cliente={{
                id: cliente.id,
                nome: cliente.nome,
                endereco: cliente.endereco,
                ativo: cliente.ativo,
                valorBandaEfetivo: formatarMoeda(
                  valorEfetivo(cliente.valorBanda, empresa.valorBandaPadrao)
                ),
                valorTaxaExtraEfetivo: formatarMoeda(
                  valorEfetivo(cliente.valorTaxaExtra, empresa.valorTaxaExtraPadrao)
                ),
              }}
            />
          ))}
        </ul>
      )}

      <NovoClienteForm
        valorBandaPadrao={formatarMoeda(empresa.valorBandaPadrao)}
        valorTaxaExtraPadrao={formatarMoeda(empresa.valorTaxaExtraPadrao)}
      />
    </div>
  );
}

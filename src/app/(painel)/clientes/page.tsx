import { requireTenantCompleto } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { formatarMoeda, valorEfetivo } from "@/lib/valores";
import { turnoAtivoAgora, motosContratadasNoTurno } from "@/lib/equipe";
import ClienteRow from "./ClienteRow";
import NovoClienteForm from "./NovoClienteForm";

export default async function ClientesPage() {
  const sessao = await requireTenantCompleto();

  const [empresa, clientes] = await Promise.all([
    prisma.empresa.findUniqueOrThrow({
      where: { id: sessao.empresaEfetivoId },
      select: {
        valorBandaMotoboyPadrao: true,
        valorBandaClientePadrao: true,
      },
    }),
    prisma.cliente.findMany({
      where: { empresaId: sessao.empresaEfetivoId },
      orderBy: { nome: "asc" },
      include: {
        _count: { select: { turnos: { where: { status: "ABERTO" } }, turnosFixos: true } },
      },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Clientes</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Empresas atendidas pela cooperativa — cada uma pode ter seu próprio preço e horários.
        </p>
      </div>

      {clientes.length === 0 ? (
        <p className="text-stone-500 text-sm">Nenhum cliente cadastrado ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {clientes.map((cliente) => {
            const usaValorFixo = cliente._count.turnosFixos > 0;
            const resumoPreco = usaValorFixo
              ? `valor fixo por turno (${cliente._count.turnosFixos} perfil${cliente._count.turnosFixos === 1 ? "" : "is"})`
              : `banda R$ ${formatarMoeda(
                  valorEfetivo(cliente.valorBandaMotoboy, empresa.valorBandaMotoboyPadrao)
                )}`;

            const turnoAtual = turnoAtivoAgora(cliente);
            const contratadas = motosContratadasNoTurno(cliente, turnoAtual);
            const abertosAgora = cliente._count.turnos;
            const equipeIncompleta =
              cliente.ativo && turnoAtual !== null && contratadas > 0 && abertosAgora < contratadas;

            return (
              <ClienteRow
                key={cliente.id}
                cliente={{
                  id: cliente.id,
                  nome: cliente.nome,
                  endereco: cliente.endereco,
                  ativo: cliente.ativo,
                  resumoPreco,
                  equipeIncompleta,
                }}
              />
            );
          })}
        </ul>
      )}

      <NovoClienteForm />
    </div>
  );
}

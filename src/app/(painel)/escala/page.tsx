import { requireTenant } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { dataISOBrasil, formatarHora } from "@/lib/data";
import EscalaRow from "./EscalaRow";
import CandidatoRow from "./CandidatoRow";

export default async function EscalaPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string; data?: string; turno?: string }>;
}) {
  const sessao = await requireTenant();
  const params = await searchParams;

  const clientes = await prisma.cliente.findMany({
    where: { empresaId: sessao.empresaEfetivoId, ativo: true },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  const clienteId = Number(params.clienteId) || clientes[0]?.id;
  const data = params.data || dataISOBrasil();
  const turno = params.turno === "NOITE" ? "NOITE" : "MANHA";

  if (!clienteId) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-navy-900">Escala</h1>
        <p className="text-sm text-stone-500">Cadastre um cliente antes de montar a escala.</p>
      </div>
    );
  }

  const [escalados, candidatosBrutos] = await Promise.all([
    prisma.escalaTurno.findMany({
      where: { clienteId, data: new Date(data), turno },
      include: {
        motoboy: { select: { id: true, nomeCompleto: true, tipoEquipamento: true } },
        turnoVinculado: { select: { horaInicio: true } },
      },
      orderBy: { criadoEm: "asc" },
    }),
    prisma.motoboy.findMany({
      where: {
        empresaId: sessao.empresaEfetivoId,
        ativo: true,
        OR: [{ livre: true }, { clientesLiberados: { some: { clienteId, liberado: true } } }],
      },
      orderBy: { nomeCompleto: "asc" },
      select: { id: true, nomeCompleto: true, tipoEquipamento: true },
    }),
  ]);

  const escaladosIds = new Set(escalados.map((e) => e.motoboyId));
  const candidatos = candidatosBrutos.filter((m) => !escaladosIds.has(m.id));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Escala</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Escale manualmente quem vai trabalhar em cada cliente — o cliente vê isso no portal dele
          e o card fica verde assim que o motoboy bater o início do turno.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Cliente</span>
          <select
            name="clienteId"
            defaultValue={clienteId}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
          >
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Data</span>
          <input
            type="date"
            name="data"
            defaultValue={data}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Turno</span>
          <select
            name="turno"
            defaultValue={turno}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="MANHA">Manhã</option>
            <option value="NOITE">Noite</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          Ver
        </button>
      </form>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-navy-900">
          Escalados ({escalados.length})
        </h2>
        {escalados.length === 0 ? (
          <p className="text-sm text-stone-500">Ninguém escalado ainda pra esse filtro.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {escalados.map((e) => (
              <EscalaRow
                key={e.id}
                escalaId={e.id}
                nome={e.motoboy.nomeCompleto}
                tipoEquipamento={e.motoboy.tipoEquipamento}
                chegou={e.turnoVinculado !== null}
                horaChegada={
                  e.turnoVinculado ? formatarHora(e.turnoVinculado.horaInicio) : null
                }
              />
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-navy-900">
          Disponíveis pra escalar ({candidatos.length})
        </h2>
        {candidatos.length === 0 ? (
          <p className="text-sm text-stone-500">
            Nenhum motoboy liberado nesse cliente que já não esteja escalado.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {candidatos.map((m) => (
              <CandidatoRow
                key={m.id}
                clienteId={clienteId}
                motoboyId={m.id}
                nome={m.nomeCompleto}
                tipoEquipamento={m.tipoEquipamento}
                data={data}
                turno={turno}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

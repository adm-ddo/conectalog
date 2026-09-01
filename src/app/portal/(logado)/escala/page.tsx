import { requireCliente } from "@/lib/auth-cliente";
import { prisma } from "@/lib/prisma";
import EquipamentoBadge from "@/components/EquipamentoBadge";
import type { TipoEquipamento } from "@/generated/prisma/enums";

function hojeISO(): string {
  const hoje = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`;
}

export default async function EscalaPortalPage() {
  const sessao = await requireCliente();

  const hoje = hojeISO();
  const escalas = await prisma.escalaTurno.findMany({
    where: { clienteId: sessao.clienteId, data: new Date(hoje) },
    include: {
      motoboy: { select: { nomeCompleto: true, tipoEquipamento: true } },
      turnoVinculado: { select: { horaInicio: true } },
    },
    orderBy: [{ turno: "asc" }, { criadoEm: "asc" }],
  });

  const manha = escalas.filter((e) => e.turno === "MANHA");
  const noite = escalas.filter((e) => e.turno === "NOITE");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-navy-900">Escala de hoje</h1>
        <p className="text-sm text-stone-500">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
        </p>
      </div>

      <SecaoTurno titulo="Manhã" itens={manha} />
      <SecaoTurno titulo="Noite" itens={noite} />
    </div>
  );
}

function SecaoTurno({
  titulo,
  itens,
}: {
  titulo: string;
  itens: {
    id: number;
    motoboy: { nomeCompleto: string; tipoEquipamento: TipoEquipamento | null };
    turnoVinculado: { horaInicio: Date } | null;
  }[];
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-navy-900">{titulo}</h2>
      {itens.length === 0 ? (
        <p className="text-sm text-stone-500">Ninguém escalado pra esse turno hoje.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {itens.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-stone-100 px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                    e.turnoVinculado ? "bg-brand-500" : "bg-stone-300"
                  }`}
                />
                <span className="text-sm font-medium text-navy-900 truncate">
                  {e.motoboy.nomeCompleto}
                </span>
                <EquipamentoBadge tipo={e.motoboy.tipoEquipamento} />
              </div>
              <span className="text-xs text-stone-500 shrink-0">
                {e.turnoVinculado
                  ? `Chegou às ${e.turnoVinculado.horaInicio.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "Aguardando"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

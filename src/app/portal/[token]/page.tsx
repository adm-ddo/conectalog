import { notFound } from "next/navigation";
import Link from "next/link";
import { resolverClientePortal } from "@/lib/portal";
import { prisma } from "@/lib/prisma";
import EquipamentoBadge from "@/components/EquipamentoBadge";
import type { TipoEquipamento } from "@/generated/prisma/enums";

function hojeISO(): string {
  const hoje = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`;
}

export default async function PortalEscalaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const cliente = await resolverClientePortal(token);
  if (!cliente) notFound();

  const escalas = await prisma.escalaTurno.findMany({
    where: { clienteId: cliente.id, data: new Date(hojeISO()) },
    include: {
      motoboy: { select: { nomeCompleto: true, tipoEquipamento: true } },
      turnoVinculado: { select: { id: true, horaInicio: true, avaliacao: { select: { nota: true } } } },
    },
    orderBy: [{ turno: "asc" }, { criadoEm: "asc" }],
  });

  const manha = escalas.filter((e) => e.turno === "MANHA");
  const noite = escalas.filter((e) => e.turno === "NOITE");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-navy-900">Escala de hoje</h1>
          <p className="text-sm text-stone-500">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </p>
        </div>
        <Link
          href={`/portal/${token}/apoio`}
          className="rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold px-3 py-2 transition-colors shrink-0"
        >
          🆘 Pedir apoio
        </Link>
      </div>

      <SecaoTurno token={token} titulo="Manhã" itens={manha} />
      <SecaoTurno token={token} titulo="Noite" itens={noite} />
    </div>
  );
}

function SecaoTurno({
  token,
  titulo,
  itens,
}: {
  token: string;
  titulo: string;
  itens: {
    id: number;
    motoboy: { nomeCompleto: string; tipoEquipamento: TipoEquipamento | null };
    turnoVinculado: { id: number; horaInicio: Date; avaliacao: { nota: number } | null } | null;
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
              {e.turnoVinculado?.avaliacao ? (
                <span className="text-xs text-stone-500 shrink-0">
                  {"★".repeat(e.turnoVinculado.avaliacao.nota)} avaliado
                </span>
              ) : e.turnoVinculado ? (
                <Link
                  href={`/portal/${token}/encerrar/${e.turnoVinculado.id}`}
                  className="text-xs font-semibold text-brand-700 hover:underline shrink-0"
                >
                  Encerrar e avaliar
                </Link>
              ) : (
                <span className="text-xs text-stone-500 shrink-0">Aguardando</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

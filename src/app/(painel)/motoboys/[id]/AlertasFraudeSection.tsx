import Link from "next/link";

/** Alerta permanente e visível no perfil do motoboy pra cada turno que um
 * gestor já invalidou por suspeita de fraude (ver invalidarTurnoPorFraude,
 * turnos/[id]/actions.ts) — diferente de OcorrenciasSection (que é sobre
 * problema num pedido específico), aqui é sobre a CONFIABILIDADE do
 * próprio motoboy: ele alegou ter trabalhado e o cliente negou. Fica mais
 * grave visualmente (fundo escuro) de propósito, pra não passar batido
 * quando outro gestor for decidir se libera ele num cliente novo. */
export default function AlertasFraudeSection({
  alertas,
}: {
  alertas: {
    turnoId: number;
    clienteNome: string;
    data: string;
    porUsuarioNome: string;
    motivo: string | null;
    bandasAlegadas: number;
    retornosAlegados: number;
  }[];
}) {
  if (alertas.length === 0) return null;

  return (
    <div className="rounded-2xl border border-red-500 bg-red-950 p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-white">
        🚩 Alertas de fraude ({alertas.length})
      </h2>
      <p className="text-xs text-red-200">
        Turnos invalidados por um gestor porque o motoboy alegou ter trabalhado e o cliente negou.
      </p>
      <ul className="flex flex-col gap-2">
        {alertas.map((a) => (
          <li key={a.turnoId} className="rounded-lg border border-red-800 bg-red-900/40 px-3 py-2 flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <Link href={`/turnos/${a.turnoId}`} className="text-sm font-medium text-white hover:underline">
                {a.clienteNome} — {a.data}
              </Link>
              <span className="shrink-0 text-[10px] font-bold uppercase text-red-200">
                por {a.porUsuarioNome}
              </span>
            </div>
            <p className="text-xs text-red-200">
              Alegou {a.bandasAlegadas} banda{a.bandasAlegadas === 1 ? "" : "s"}
              {a.retornosAlegados > 0 && <> e {a.retornosAlegados} retorno{a.retornosAlegados === 1 ? "" : "s"}</>}.
            </p>
            {a.motivo && <p className="text-sm text-red-100 italic">“{a.motivo}”</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

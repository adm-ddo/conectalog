import Link from "next/link";

const LABEL_STATUS: Record<string, string> = {
  ABERTO: "Aberto",
  CONCLUIDO: "Concluído",
  PAGO: "Pago",
};

const COR_STATUS: Record<string, string> = {
  ABERTO: "bg-amber-100 text-amber-800",
  CONCLUIDO: "bg-stone-100 text-stone-700",
  PAGO: "bg-brand-100 text-brand-800",
};

export default function TurnosSection({
  motoboyId,
  totalTurnos,
  turnos,
}: {
  motoboyId: number;
  totalTurnos: number;
  turnos: {
    id: number;
    clienteNome: string;
    data: string;
    status: string;
    bandas: number;
    valor: string;
  }[];
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-navy-900">Turnos ({totalTurnos})</h2>
        <Link href={`/turnos?motoboyId=${motoboyId}`} className="text-xs text-brand-700 hover:underline">
          Ver todos
        </Link>
      </div>
      {turnos.length === 0 ? (
        <p className="text-sm text-stone-400">Ainda não fez nenhum turno.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {turnos.map((t) => (
            <li key={t.id}>
              <Link
                href={`/turnos/${t.id}`}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 rounded-lg border border-stone-100 px-3 py-2 hover:border-brand-300 transition-colors"
              >
                <span className="text-sm text-navy-900 min-w-0 truncate">
                  {t.clienteNome} — {t.data}
                </span>
                <span className="flex items-center gap-2 flex-wrap sm:shrink-0">
                  <span className="text-xs text-stone-500">{t.bandas} bandas</span>
                  <span className="text-sm font-medium text-navy-900">R$ {t.valor}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${COR_STATUS[t.status]}`}>
                    {LABEL_STATUS[t.status]}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

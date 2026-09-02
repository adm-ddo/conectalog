export default function DescontosAssiduidadeSection({
  descontos,
}: {
  descontos: {
    id: number;
    clienteNome: string;
    minutosAtraso: number;
    valor: string;
    data: string;
    descontado: boolean;
  }[];
}) {
  if (descontos.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-white p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-amber-700">
        Descontos por atraso ({descontos.length})
      </h2>
      <ul className="flex flex-col gap-2">
        {descontos.map((d) => (
          <li key={d.id} className="rounded-lg border border-amber-100 px-3 py-2 flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-navy-900">
              {d.clienteNome} — {d.data} · {d.minutosAtraso} min de atraso
            </span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                d.descontado ? "bg-stone-100 text-stone-600" : "bg-amber-100 text-amber-700"
              }`}
            >
              {d.descontado ? "Já descontado" : `R$ ${d.valor} a descontar`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

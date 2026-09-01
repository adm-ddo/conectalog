export default function OcorrenciasSection({
  ocorrencias,
}: {
  ocorrencias: {
    id: number;
    clienteNome: string;
    descricao: string;
    valor: string;
    data: string;
    descontado: boolean;
  }[];
}) {
  if (ocorrencias.length === 0) return null;

  return (
    <div className="rounded-2xl border border-red-200 bg-white p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-red-700">
        Ocorrências ({ocorrencias.length})
      </h2>
      <ul className="flex flex-col gap-2">
        {ocorrencias.map((o) => (
          <li key={o.id} className="rounded-lg border border-red-100 px-3 py-2 flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-navy-900">
                {o.clienteNome} — {o.data}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  o.descontado ? "bg-stone-100 text-stone-600" : "bg-red-100 text-red-700"
                }`}
              >
                {o.descontado ? "Já descontado" : `R$ ${o.valor} a descontar`}
              </span>
            </div>
            <p className="text-sm text-stone-600">{o.descricao}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

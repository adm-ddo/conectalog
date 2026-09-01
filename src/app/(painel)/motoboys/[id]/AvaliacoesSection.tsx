import EstrelasMedia from "@/components/EstrelasMedia";

/** Só a cooperativa vê o detalhe de cada avaliação (quem avaliou e o
 * comentário) — o motoboy só vê a média, sem saber quem avaliou nem ler
 * críticas específicas (ver EstrelasMedia usado em /app/inicio). */
export default function AvaliacoesSection({
  media,
  total,
  avaliacoes,
}: {
  media: number;
  total: number;
  avaliacoes: { id: number; nota: number; comentario: string | null; clienteNome: string; data: string }[];
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-navy-900">Avaliações</h2>
        <EstrelasMedia media={media} total={total} />
      </div>

      {avaliacoes.length === 0 ? (
        <p className="text-sm text-stone-500">Nenhuma avaliação registrada ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {avaliacoes.map((a) => (
            <li key={a.id} className="rounded-xl border border-stone-100 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-navy-900">{a.clienteNome}</span>
                <span className="text-amber-400 text-sm leading-none">
                  {"★".repeat(a.nota)}
                  <span className="text-stone-300">{"★".repeat(5 - a.nota)}</span>
                </span>
              </div>
              <p className="text-xs text-stone-400">{a.data}</p>
              {a.comentario && <p className="text-sm text-stone-600 mt-1">{a.comentario}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

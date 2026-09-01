/** Média de estrelas só (sem quem avaliou, sem comentário) — o motoboy vê
 * isso como no Uber: sabe a nota, não sabe o detalhe de cada avaliação
 * (isso só a cooperativa vê, ver src/app/(painel)/motoboys/[id]/AvaliacoesSection.tsx). */
export default function EstrelasMedia({
  media,
  total,
}: {
  media: number;
  total: number;
}) {
  if (total === 0) {
    return <p className="text-sm text-stone-500">Ainda sem avaliações.</p>;
  }

  const arredondada = Math.round(media);

  return (
    <div className="flex items-center gap-2">
      <span className="text-lg leading-none">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < arredondada ? "text-amber-400" : "text-stone-300"}>
            ★
          </span>
        ))}
      </span>
      <span className="text-sm font-semibold text-navy-900">{media.toFixed(1)}</span>
      <span className="text-xs text-stone-500">
        ({total} avaliaç{total === 1 ? "ão" : "ões"})
      </span>
    </div>
  );
}

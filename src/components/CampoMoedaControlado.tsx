"use client";

/** Mesma máscara de vírgula automática do CampoMoeda, mas controlado por
 * valor/onChange em vez de um hidden input com `name` — pra usar fora de
 * um <form action={...}> (ex: fluxos que chamam a server action direto
 * via startTransition, com um objeto tipado em vez de FormData). */
export default function CampoMoedaControlado({
  label,
  valor,
  onChange,
}: {
  label?: string;
  valor: number;
  onChange: (novoValor: number) => void;
}) {
  const formatado =
    valor > 0
      ? valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : "";

  function aoDigitar(e: React.ChangeEvent<HTMLInputElement>) {
    const digitos = e.target.value.replace(/\D/g, "");
    onChange(digitos ? Number(digitos) / 100 : 0);
  }

  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-xs text-stone-500">{label}</span>}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400 pointer-events-none">
          R$
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={formatado}
          onChange={aoDigitar}
          placeholder="0,00"
          className="border border-stone-300 rounded-lg pl-9 pr-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
    </label>
  );
}

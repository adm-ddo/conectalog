"use client";

/** Contador +/- pra quantidade de bandas ou taxas extras — pensado pra
 * ser rápido de mexer com o polegar no celular, sem precisar digitar. */
export default function ContadorStepper({
  label,
  valor,
  onChange,
  min = 0,
}: {
  label: string;
  valor: number;
  onChange: (novoValor: number) => void;
  min?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, valor - 1))}
          className="h-9 w-9 rounded-full bg-stone-100 hover:bg-stone-200 text-lg font-bold text-stone-700 flex items-center justify-center transition-colors"
        >
          −
        </button>
        <span className="w-8 text-center text-lg font-bold text-navy-900">{valor}</span>
        <button
          type="button"
          onClick={() => onChange(valor + 1)}
          className="h-9 w-9 rounded-full bg-brand-100 hover:bg-brand-200 text-lg font-bold text-brand-700 flex items-center justify-center transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

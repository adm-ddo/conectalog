"use client";

import { useActionState, useState } from "react";
import { atualizarLogo } from "./actions";

export default function LogoForm({ logoUrlAtual }: { logoUrlAtual: string | null }) {
  const [state, formAction, pending] = useActionState(atualizarLogo, undefined);
  const [preview, setPreview] = useState<string | null>(null);

  function lerArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = () => setPreview(String(leitor.result));
    leitor.readAsDataURL(arquivo);
  }

  return (
    <form action={formAction} className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-navy-900">Logo da cooperativa</h2>
      <p className="text-xs text-stone-500">
        Aparece grande no app do motoboy e no painel — como se fosse o app da sua empresa.
      </p>

      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-center overflow-hidden shrink-0">
          {preview || logoUrlAtual ? (
            // eslint-disable-next-line @next/next/no-img-element -- preview de data URL / logo já hospedado no Blob, next/image não se aplica aqui
            <img src={preview ?? logoUrlAtual ?? ""} alt="Logo" className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs text-stone-400">Sem logo</span>
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={lerArquivo}
          className="text-sm text-stone-600"
        />
      </div>
      <input type="hidden" name="logoDataUrl" value={preview ?? ""} />

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !preview}
        className="self-start rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2.5 disabled:opacity-50 transition-colors"
      >
        {pending ? "Enviando..." : "Salvar logo"}
      </button>
    </form>
  );
}

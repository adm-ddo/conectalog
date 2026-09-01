"use client";

import { useState, useTransition } from "react";
import CameraCapture from "@/components/CameraCapture";
import SignaturePadInput from "@/components/SignaturePadInput";
import ContadorStepper from "@/components/ContadorStepper";
import { encerrarTurno } from "./actions";

export default function EncerrarTurnoWizard({ clienteNome }: { clienteNome: string }) {
  const [passo, setPasso] = useState(0);
  const [fotoFimDataUrl, setFotoFimDataUrl] = useState<string | null>(null);
  const [bandas, setBandas] = useState(0);
  const [taxasExtras, setTaxasExtras] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function assinar(assinaturaReciboDataUrl: string) {
    if (!fotoFimDataUrl) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await encerrarTurno({
        quantidadeBandas: bandas,
        quantidadeTaxasExtras: taxasExtras,
        fotoFimDataUrl,
        assinaturaReciboDataUrl,
      });
      if (resultado?.erro) setErro(resultado.erro);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {passo === 0 && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-stone-600">
            Tire uma foto agora, em {clienteNome}, encerrando o turno.
          </p>
          {fotoFimDataUrl ? (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- preview local de data URL */}
              <img
                src={fotoFimDataUrl}
                alt="Encerramento"
                className="w-full max-w-sm rounded-xl object-cover border border-stone-300"
              />
              <button
                type="button"
                onClick={() => setPasso(1)}
                className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-6 py-2.5 transition-colors"
              >
                Continuar
              </button>
            </div>
          ) : (
            <CameraCapture camera="user" onCapture={(dataUrl) => setFotoFimDataUrl(dataUrl)} />
          )}
        </div>
      )}

      {passo === 1 && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-stone-600">Quantas bandas você fez nesse turno?</p>
          <ContadorStepper label="Bandas" valor={bandas} onChange={setBandas} />
          <ContadorStepper label="Taxas extras" valor={taxasExtras} onChange={setTaxasExtras} />
          <button
            type="button"
            onClick={() => setPasso(2)}
            disabled={bandas <= 0 && taxasExtras <= 0}
            className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors"
          >
            Continuar
          </button>
        </div>
      )}

      {passo === 2 && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-stone-600">
            Assine o recibo pra confirmar {bandas} bandas e {taxasExtras} taxas extras.
          </p>
          <SignaturePadInput onConfirm={assinar} confirmLabel="Assinar e encerrar turno" />
        </div>
      )}

      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {erro}
        </p>
      )}
      {pending && <p className="text-sm text-stone-500">Enviando...</p>}
    </div>
  );
}

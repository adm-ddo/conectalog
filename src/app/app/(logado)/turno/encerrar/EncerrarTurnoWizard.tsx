"use client";

import { useState, useTransition } from "react";
import CameraCapture from "@/components/CameraCapture";
import SignaturePadInput from "@/components/SignaturePadInput";
import ContadorStepper from "@/components/ContadorStepper";
import { encerrarTurno } from "./actions";

export default function EncerrarTurnoWizard({
  clienteNome,
  taxasExtras,
}: {
  clienteNome: string;
  taxasExtras: { id: number; descricao: string }[];
}) {
  const [passo, setPasso] = useState(0);
  const [fotoFimDataUrl, setFotoFimDataUrl] = useState<string | null>(null);
  const [bandas, setBandas] = useState(0);
  const [quantidades, setQuantidades] = useState<Record<number, number>>({});
  const [assinaturaReciboDataUrl, setAssinaturaReciboDataUrl] = useState<string | null>(null);
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const totalTaxasExtras = Object.values(quantidades).reduce((soma, v) => soma + v, 0);

  function concluir() {
    if (!fotoFimDataUrl || !assinaturaReciboDataUrl) return;
    if (nota === 0) return setErro("Selecione uma nota de 1 a 5 pra avaliar a empresa.");
    setErro(null);
    startTransition(async () => {
      const resultado = await encerrarTurno({
        quantidadeBandas: bandas,
        taxasExtras: taxasExtras.map((t) => ({
          itemId: t.id,
          quantidade: quantidades[t.id] ?? 0,
        })),
        fotoFimDataUrl,
        assinaturaReciboDataUrl,
        nota,
        comentario,
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
            <CameraCapture
              camera="environment"
              ladoMaximoPx={640}
              onCapture={(dataUrl) => setFotoFimDataUrl(dataUrl)}
            />
          )}
        </div>
      )}

      {passo === 1 && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-stone-600">Quantas bandas você fez nesse turno?</p>
          <ContadorStepper label="Bandas" valor={bandas} onChange={setBandas} />
          {taxasExtras.map((t) => (
            <ContadorStepper
              key={t.id}
              label={t.descricao}
              valor={quantidades[t.id] ?? 0}
              onChange={(v) => setQuantidades((prev) => ({ ...prev, [t.id]: v }))}
            />
          ))}
          <button
            type="button"
            onClick={() => setPasso(2)}
            disabled={bandas <= 0 && totalTaxasExtras <= 0}
            className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors"
          >
            Continuar
          </button>
        </div>
      )}

      {passo === 2 && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-stone-600">
            Assine o recibo pra confirmar {bandas} bandas e {totalTaxasExtras} taxas extras.
          </p>
          <SignaturePadInput
            onConfirm={(dataUrl) => {
              setAssinaturaReciboDataUrl(dataUrl);
              setPasso(3);
            }}
            confirmLabel="Assinar"
          />
        </div>
      )}

      {passo === 3 && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-stone-600">
            Por último, como foi o atendimento em {clienteNome} nesse turno?
          </p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNota(n)}
                className={`text-3xl leading-none ${n <= nota ? "text-amber-400" : "text-stone-300"}`}
                aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
              >
                ★
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-stone-500">
              Aconteceu algo nesse turno? (opcional)
            </span>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
              placeholder="Ex.: demora pra liberar o pedido, falta de organização, tudo certo..."
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <button
            type="button"
            onClick={concluir}
            disabled={nota === 0 || pending}
            className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors"
          >
            {pending ? "Enviando..." : "Concluir e encerrar turno"}
          </button>
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

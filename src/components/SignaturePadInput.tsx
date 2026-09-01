"use client";

import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";

export default function SignaturePadInput({
  onConfirm,
  confirmLabel = "Confirmar assinatura",
}: {
  onConfirm: (dataUrl: string) => void | Promise<void>;
  confirmLabel?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [vazio, setVazio] = useState(true);
  // Sem isso, com rede lenta a pessoa via o botão continuar clicável
  // durante o envio e batia de novo — cada clique extra arriscava duplicar
  // o registro no banco.
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function ajustarTamanho() {
      if (!canvas) return;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d")?.scale(ratio, ratio);
      padRef.current?.clear();
    }

    ajustarTamanho();
    const pad = new SignaturePad(canvas, {
      penColor: "#1c1917",
      minWidth: 0.6,
      maxWidth: 1.8,
      minDistance: 1,
    });
    pad.addEventListener("endStroke", () => setVazio(pad.isEmpty()));
    padRef.current = pad;

    window.addEventListener("resize", ajustarTamanho);
    return () => {
      window.removeEventListener("resize", ajustarTamanho);
      pad.off();
    };
  }, []);

  function limpar() {
    padRef.current?.clear();
    setVazio(true);
  }

  async function confirmar() {
    const pad = padRef.current;
    if (!pad || pad.isEmpty() || enviando) return;
    setEnviando(true);
    try {
      await onConfirm(pad.toDataURL("image/png"));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <canvas
        ref={canvasRef}
        className="w-full max-w-lg h-56 rounded-xl border-2 border-stone-300 bg-white touch-none"
      />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={limpar}
          disabled={enviando}
          className="rounded-xl border border-stone-300 text-lg px-6 py-3 text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          Limpar
        </button>
        <button
          type="button"
          onClick={confirmar}
          disabled={vazio || enviando}
          className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-lg font-medium px-8 py-3 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {enviando && (
            <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          )}
          {enviando ? "Enviando..." : confirmLabel}
        </button>
      </div>
    </div>
  );
}

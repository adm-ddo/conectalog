"use client";

import { useEffect, useRef, useState } from "react";

const CONTAGEM_INICIAL = 3;

// Limita o lado maior da foto e comprime como JPEG — a câmera de um celular
// moderno captura em resolução bem maior do que o necessário só pra
// conferir a chegada/CNH, e isso mantém o upload leve.
const LADO_MAXIMO_PX = 1280;
const QUALIDADE_JPEG = 0.82;

export default function CameraCapture({
  onCapture,
  camera = "user",
}: {
  onCapture: (dataUrl: string) => void | Promise<void>;
  /** "user" = câmera frontal (selfie), "environment" = traseira (documento). */
  camera?: "user" | "environment";
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  const [iniciado, setIniciado] = useState(false);
  const [contagem, setContagem] = useState(CONTAGEM_INICIAL);
  // Depois da foto tirada, alguns fluxos já mandam pro servidor aqui dentro
  // — sem isso a tela ficava parada em "Capturando..." enquanto esperava a
  // rede, parecendo travada.
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let cancelado = false;

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: camera }, audio: false })
      .then((stream) => {
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setPronto(true);
      })
      .catch(() => {
        setErro(
          "Não foi possível acessar a câmera. Verifique a permissão do navegador."
        );
      });

    return () => {
      cancelado = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [camera]);

  async function capturar() {
    const video = videoRef.current;
    if (!video) return;

    const escala = Math.min(
      1,
      LADO_MAXIMO_PX / Math.max(video.videoWidth, video.videoHeight)
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * escala);
    canvas.height = Math.round(video.videoHeight * escala);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    streamRef.current?.getTracks().forEach((t) => t.stop());

    setEnviando(true);
    try {
      await onCapture(canvas.toDataURL("image/jpeg", QUALIDADE_JPEG));
    } finally {
      setEnviando(false);
    }
  }

  // Clicar em "Tirar foto" só começa a contagem — dá tempo da pessoa se
  // posicionar antes da foto ser tirada sozinha.
  useEffect(() => {
    if (!pronto || !iniciado) return;
    if (contagem === 0) {
      const id = setTimeout(capturar, 0);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setContagem((c) => c - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- capturar só usa refs estáveis
  }, [pronto, iniciado, contagem]);

  if (erro) {
    return (
      <p className="text-lg text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
        {erro}
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full max-w-lg rounded-xl border border-stone-300 bg-stone-900 aspect-video object-cover"
      />
      {!pronto ? (
        <p className="text-lg text-stone-500">Preparando câmera...</p>
      ) : !iniciado ? (
        <button
          type="button"
          onClick={() => setIniciado(true)}
          className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-2xl font-medium px-8 py-4 transition-colors"
        >
          Tirar foto
        </button>
      ) : (
        <p className="text-4xl font-semibold text-navy-900 flex items-center gap-3">
          {enviando && (
            <span className="h-7 w-7 rounded-full border-4 border-navy-900 border-t-transparent animate-spin" />
          )}
          {enviando
            ? "Enviando..."
            : contagem > 0
              ? `Tirando foto em ${contagem}...`
              : "Capturando..."}
        </p>
      )}
    </div>
  );
}

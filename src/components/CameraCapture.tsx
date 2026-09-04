"use client";

import { useEffect, useRef, useState } from "react";

// Limita o lado maior da foto e comprime como JPEG — a câmera de um celular
// moderno captura em resolução bem maior do que o necessário, e isso mantém
// o upload leve. Padrão de 1280px serve selfie/CNH (precisa de mais
// detalhe pra conferência de identidade); foto de início/fim de turno é só
// prova de que o motoboy chegou/saiu do local, então pode usar um valor
// bem menor (ver `ladoMaximoPx` passado por quem usa o componente).
const LADO_MAXIMO_PX_PADRAO = 1280;
const QUALIDADE_JPEG = 0.82;

export default function CameraCapture({
  onCapture,
  camera = "user",
  ladoMaximoPx = LADO_MAXIMO_PX_PADRAO,
}: {
  onCapture: (dataUrl: string) => void | Promise<void>;
  /** "user" = câmera frontal (selfie), "environment" = traseira (documento). */
  camera?: "user" | "environment";
  /** Lado maior da foto final, em pixels — reduz o arquivo pra fotos que só
   * precisam provar presença (início/fim de turno), sem precisar do
   * detalhe de uma foto de identidade. */
  ladoMaximoPx?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  // Depois da foto tirada, alguns fluxos já mandam pro servidor aqui dentro
  // — sem isso a tela ficava parada em "Capturando..." enquanto esperava a
  // rede, parecendo travada.
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let cancelado = false;

    // getUserMedia só existe em contexto seguro (https ou localhost) —
    // em http puro (ex.: testando pelo IP da rede local, tipo
    // 192.168.x.x, sem https) ou dentro do navegador embutido de outro
    // app (WhatsApp/Instagram), `navigator.mediaDevices` vem undefined.
    // Sem essa checagem explícita, `mediaDevices?.getUserMedia(...)`
    // encadeado com `?.` vira `undefined` inteiro (o `?.` corta a
    // cadeia toda), o `.then/.catch` nunca roda, e a tela fica presa em
    // "Preparando câmera..." pra sempre, sem erro nenhum aparecer — por
    // isso a checagem também vira uma Promise rejeitada, tratada no
    // mesmo `.catch` abaixo, em vez de um `return` síncrono com setState
    // direto no corpo do efeito.
    const contextoSemSuporte = !navigator.mediaDevices;
    const pedido = contextoSemSuporte
      ? Promise.reject(new Error("getUserMedia indisponível neste contexto"))
      : navigator.mediaDevices.getUserMedia({ video: { facingMode: camera }, audio: false });

    pedido
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
      .catch((err) => {
        console.error("Falha ao acessar a câmera:", err);
        setErro(
          contextoSemSuporte
            ? 'Não foi possível acessar a câmera aqui. Se você abriu esse link dentro de outro aplicativo (WhatsApp, Instagram), toque em "Abrir no navegador" e tente de novo.'
            : "Não foi possível acessar a câmera. Verifique a permissão do navegador."
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
      ladoMaximoPx / Math.max(video.videoWidth, video.videoHeight)
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

  if (erro) {
    return (
      <p className="text-lg text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
        {erro}
      </p>
    );
  }

  // O guia oval só faz sentido pra selfie (câmera frontal) — pra foto de
  // documento/local (câmera traseira) não tem rosto pra centralizar.
  const ehSelfie = camera === "user";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-lg">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full rounded-xl border border-stone-300 bg-stone-900 object-cover ${
            ehSelfie ? "aspect-[3/4]" : "aspect-video"
          }`}
        />
        {ehSelfie && pronto && !enviando && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none overflow-hidden rounded-xl">
            <div className="w-[58%] aspect-[3/4] rounded-[50%] border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.55)]" />
            <p className="absolute bottom-4 inset-x-4 text-center text-sm font-medium text-white drop-shadow">
              Centralize seu rosto no oval
            </p>
          </div>
        )}
      </div>
      {!pronto ? (
        <p className="text-lg text-stone-500">Preparando câmera...</p>
      ) : enviando ? (
        <p className="text-4xl font-semibold text-navy-900 flex items-center gap-3">
          <span className="h-7 w-7 rounded-full border-4 border-navy-900 border-t-transparent animate-spin" />
          Enviando...
        </p>
      ) : (
        <button
          type="button"
          onClick={capturar}
          className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-2xl font-medium px-8 py-4 transition-colors"
        >
          Tirar foto
        </button>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useTransition } from "react";
import { responderSolicitacaoApoio } from "./actions";

/** Beep curto via Web Audio API — sem depender de arquivo de áudio.
 * Navegadores só deixam tocar som depois de alguma interação da pessoa
 * na página (política padrão de autoplay); numa tela de painel que fica
 * aberta o dia todo isso tende a já ter acontecido, mas não é garantido
 * na primeira carga. */
function tocarBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // Silencioso de propósito — o alerta visual já é o essencial, o som
    // é só um extra que pode falhar sem quebrar nada.
  }
}

export default function SolicitacaoApoioAlert({
  solicitacoes,
}: {
  solicitacoes: { id: number; quantidade: number; clienteNome: string; criadoEm: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const idsVistos = useRef<Set<number>>(new Set());

  useEffect(() => {
    const novas = solicitacoes.filter((s) => !idsVistos.current.has(s.id));
    // Só beepa pra pedido que chegou DEPOIS da página já estar aberta —
    // size > 0 marca que já passamos pelo menos uma vez por aqui, senão
    // um backlog de pedidos antigos faria barulho só por carregar a tela.
    if (novas.length > 0 && idsVistos.current.size > 0) {
      tocarBeep();
    }
    solicitacoes.forEach((s) => idsVistos.current.add(s.id));
  }, [solicitacoes]);

  if (solicitacoes.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-amber-800">
        🆘 Pedido de apoio ({solicitacoes.length})
      </h2>
      <ul className="flex flex-col gap-2">
        {solicitacoes.map((s) => (
          <li
            key={s.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-white px-4 py-3"
          >
            <span className="text-sm text-navy-900">
              <strong>{s.clienteNome}</strong> pediu {s.quantidade} moto
              {s.quantidade > 1 ? "s" : ""} de apoio — {s.criadoEm}
            </span>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(() => responderSolicitacaoApoio(s.id, "A_CAMINHO"))}
                className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-2 disabled:opacity-50 transition-colors"
              >
                Apoio a caminho
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(() => responderSolicitacaoApoio(s.id, "SEM_MOTO"))}
                className="rounded-lg border border-stone-300 text-stone-700 text-xs font-semibold px-3 py-2 disabled:opacity-50"
              >
                Sem moto no momento
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

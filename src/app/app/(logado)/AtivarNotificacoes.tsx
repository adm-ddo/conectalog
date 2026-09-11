"use client";

import { useEffect, useState } from "react";
import { inscreverPush } from "./actions";

const CHAVE_DISPENSADO = "conectalog-notificacoes-dispensadas";

/** Converte a chave pública VAPID (base64url) pro Uint8Array que
 * PushManager.subscribe espera — conversão padrão da Web Push API, não
 * tem forma mais direta. */
function paraUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function estaNoIphoneForaDaTelaDeInicio(): boolean {
  const ehIphone = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const instalado =
    (navigator as unknown as { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
  return ehIphone && !instalado;
}

/** Registra o service worker (se ainda não tiver) e garante uma
 * PushSubscription ativa, salvando no servidor — reaproveitado tanto
 * pra reforçar uma inscrição já concedida (no mount) quanto pro clique
 * em "Ativar". */
async function garantirInscricao() {
  const chave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!chave) return;
  const registro = await navigator.serviceWorker.register("/sw.js");
  const existente = await registro.pushManager.getSubscription();
  const inscricao =
    existente ??
    (await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: paraUint8Array(chave) as BufferSource,
    }));
  const json = inscricao.toJSON();
  if (json.endpoint && json.keys?.p256dh && json.keys.auth) {
    await inscreverPush({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    });
  }
}

/** Banner discreto oferecendo ativar notificação push de verdade (toca
 * som/vibra mesmo com o app fechado) quando é escalado — sem
 * infraestrutura de push, o motoboy só descobre abrindo o app. Some
 * sozinho depois de ativado ou se o motoboy tocar "Agora não" (lembrado
 * por aparelho via localStorage, não pergunta de novo toda hora). */
export default function AtivarNotificacoes() {
  const [suportado, setSuportado] = useState(false);
  const [precisaInstalarNoIphone, setPrecisaInstalarNoIphone] = useState(false);
  const [permissao, setPermissao] = useState<NotificationPermission | null>(null);
  const [dispensado, setDispensado] = useState(true);
  const [ativando, setAtivando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Estado só descobrível no navegador (APIs de push, localStorage) —
  // não dá pra calcular no primeiro render (SSR não tem window/
  // navigator), então precisa mesmo de setState dentro de um efeito
  // rodando só uma vez após montar no cliente.
  /* eslint-disable react-hooks/set-state-in-effect -- detecção de capabilities do navegador, impossível de saber no SSR */
  useEffect(() => {
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSuportado(ok);
    if (!ok) {
      setPrecisaInstalarNoIphone(estaNoIphoneForaDaTelaDeInicio());
      return;
    }
    setPermissao(Notification.permission);
    setDispensado(localStorage.getItem(CHAVE_DISPENSADO) === "1");

    if (Notification.permission === "granted") {
      garantirInscricao().catch(() => {});
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function ativar() {
    setErro(null);
    setAtivando(true);
    try {
      const resultado = await Notification.requestPermission();
      setPermissao(resultado);
      if (resultado !== "granted") {
        setErro("Sem a permissão do navegador não dá pra ativar.");
        return;
      }
      await garantirInscricao();
    } catch {
      setErro("Não deu pra ativar agora — tenta de novo em instantes.");
    } finally {
      setAtivando(false);
    }
  }

  function dispensar() {
    localStorage.setItem(CHAVE_DISPENSADO, "1");
    setDispensado(true);
  }

  if (dispensado) return null;

  if (!suportado) {
    if (!precisaInstalarNoIphone) return null;
    return (
      <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 flex items-center justify-between gap-3">
        <p className="text-xs text-brand-800">
          No iPhone, pra ativar notificação: toque em compartilhar e depois em &quot;Adicionar à
          Tela de Início&quot;.
        </p>
        <button type="button" onClick={dispensar} className="text-xs text-brand-700 hover:underline shrink-0">
          Entendi
        </button>
      </div>
    );
  }

  if (permissao === "denied" || permissao === "granted") return null;

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-brand-800">
          Ativa as notificações pra saber na hora que for escalado, mesmo com o app fechado.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={ativar}
            disabled={ativando}
            className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-1.5 disabled:opacity-50 transition-colors"
          >
            {ativando ? "Ativando..." : "Ativar"}
          </button>
          <button type="button" onClick={dispensar} className="text-xs text-brand-700 hover:underline">
            Agora não
          </button>
        </div>
      </div>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}

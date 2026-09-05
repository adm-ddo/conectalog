"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Atualiza a página periodicamente sem precisar de WebSocket — mesmo
 * padrão simples do extras-app. Usado no dashboard e na escala do painel
 * (a cooperativa acompanhando quem chegou) e nas telas do motoboy que
 * mostram escala pendente de confirmação (pra ele ver um convite novo,
 * ou a cooperativa ver a resposta dele, sem precisar recarregar). */
export default function AutoRefresh({ intervaloMs = 30_000 }: { intervaloMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervaloMs);
    return () => clearInterval(id);
  }, [router, intervaloMs]);

  return null;
}

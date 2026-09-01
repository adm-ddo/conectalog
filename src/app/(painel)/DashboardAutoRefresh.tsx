"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Atualiza o dashboard periodicamente pra refletir turnos abertos/
 * fechados em tempo quase real — sem WebSocket, mesmo padrão simples do
 * extras-app. */
export default function DashboardAutoRefresh({
  intervaloMs = 30_000,
}: {
  intervaloMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervaloMs);
    return () => clearInterval(id);
  }, [router, intervaloMs]);

  return null;
}

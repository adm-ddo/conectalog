import { ImageResponse } from "next/og";

// Ícone que o iOS usa quando alguém faz "Adicionar à Tela de Início" —
// sem isso, o Safari tira um print da página em vez de mostrar uma logo.
// Definido na raiz (não dentro de (painel) ou app/) porque se aplica ao
// site inteiro, e o pedido foi especificamente o logo oficial no atalho.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d1b2a",
          color: "#2ecfa3",
          fontSize: 124,
          fontWeight: 900,
        }}
      >
        C
      </div>
    ),
    size
  );
}

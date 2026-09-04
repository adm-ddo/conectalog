import { ImageResponse } from "next/og";

// Ícone oficial do ConectaLog em tamanho grande, pra manifest.ts (Android
// "instalar app"/atalho na tela inicial) — sem logo por cooperativa aqui
// de propósito, o pedido foi usar o logo oficial no atalho instalado,
// diferente do favicon de aba (que já mostra a logo da cooperativa
// quando ela tem uma, ver (painel)/icon.tsx e app/icon.tsx).
export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export function GET() {
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
          fontSize: 132,
          fontWeight: 900,
        }}
      >
        C
      </div>
    ),
    size
  );
}

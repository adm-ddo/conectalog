import { ImageResponse } from "next/og";

// Mesmo ícone oficial de 192/route.tsx, só que no tamanho grande que o
// Android usa pra splash screen ao abrir o app instalado.
export const size = { width: 512, height: 512 };
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
          fontSize: 352,
          fontWeight: 900,
        }}
      >
        C
      </div>
    ),
    size
  );
}

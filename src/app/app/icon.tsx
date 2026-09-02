import { ImageResponse } from "next/og";
import { getSessaoMotoboy } from "@/lib/auth-motoboy";
import { prisma } from "@/lib/prisma";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const sessao = await getSessaoMotoboy();
  const logoUrl = sessao
    ? (
        await prisma.empresa.findUnique({
          where: { id: sessao.empresaId },
          select: { logoUrl: true },
        })
      )?.logoUrl
    : null;

  if (logoUrl?.startsWith("data:")) {
    const tipo = logoUrl.slice(5, logoUrl.indexOf(";"));
    const base64 = logoUrl.slice(logoUrl.indexOf(",") + 1);
    return new Response(Buffer.from(base64, "base64"), {
      headers: { "Content-Type": tipo || "image/png" },
    });
  }

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
          fontSize: 22,
          fontWeight: 900,
        }}
      >
        C
      </div>
    ),
    size
  );
}

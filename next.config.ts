import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Padrão é 1MB — pequeno demais pro upload de CNH (foto ou PDF da CNH
    // digital), que enviamos como data URL dentro do corpo da Server
    // Action em vez de multipart. Fotos de câmera já vêm comprimidas
    // (~1280px, JPEG), mas anexo de arquivo (PDF da carteira digital,
    // foto direto da galeria) não passa por nenhuma compressão.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;

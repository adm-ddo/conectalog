import type { MetadataRoute } from "next";

// "/" já redireciona sozinho pro dashboard (cooperativa) ou pro app
// (motoboy) conforme a sessão de quem abriu — por isso start_url pode
// ser só a raiz, sem precisar saber de antemão quem vai instalar.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ConectaLog",
    short_name: "ConectaLog",
    description:
      "Gestão de motoboys para cooperativas de entrega — jornada, bandas e pagamento em um lugar só.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d1b2a",
    theme_color: "#0d1b2a",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
    ],
  };
}

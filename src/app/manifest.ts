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
    // Preto pra bater exatamente com o fundo já embutido no ícone (ele
    // não tem transparência) — evita uma borda visível na splash screen.
    background_color: "#000000",
    theme_color: "#0d1b2a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}

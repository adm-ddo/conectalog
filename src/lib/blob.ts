import "server-only";
import { put, get } from "@vercel/blob";

/** Sobe uma imagem capturada no app (foto ou assinatura, data URL) pro
 * Vercel Blob e devolve a URL. Acesso `private` de propósito — foto e
 * assinatura de uma pessoa real não deveriam ficar acessíveis por link
 * público indefinidamente; exibir depois (relatório, painel) exige
 * `get()`, não a URL crua. `addRandomSuffix` evita colisão entre dois
 * eventos no mesmo milissegundo. */
export async function uploadDataUrl(
  caminho: string,
  dataUrl: string
): Promise<string> {
  const [prefixo, base64 = ""] = dataUrl.split(",");
  const contentType = /^data:([^;]+);base64$/.exec(prefixo)?.[1] ?? "image/png";
  const buffer = Buffer.from(base64, "base64");

  const blob = await put(caminho, buffer, {
    access: "private",
    contentType,
    addRandomSuffix: true,
  });

  return blob.url;
}

/** Sobe uma imagem de marca (logo da cooperativa) como acesso `public` —
 * ao contrário de foto/assinatura de pessoa, um logo é pensado pra
 * aparecer direto num `<img src>` no app e no painel, sem passar por
 * `baixarComoDataUrl` a cada render. */
export async function uploadDataUrlPublico(
  caminho: string,
  dataUrl: string
): Promise<string> {
  const [prefixo, base64 = ""] = dataUrl.split(",");
  const contentType = /^data:([^;]+);base64$/.exec(prefixo)?.[1] ?? "image/png";
  const buffer = Buffer.from(base64, "base64");

  const blob = await put(caminho, buffer, {
    access: "public",
    contentType,
    addRandomSuffix: true,
  });

  return blob.url;
}

/** Baixa um blob privado e devolve como data URL, pra embutir em HTML/PDF
 * sem expor a URL crua — só chamar depois de checar posse do recurso. */
export async function baixarComoDataUrl(url: string): Promise<string> {
  const resultado = await get(url, { access: "private" });
  if (!resultado?.stream) {
    throw new Error("Não foi possível carregar a imagem.");
  }
  const buffer = Buffer.from(await new Response(resultado.stream).arrayBuffer());
  const contentType = resultado.blob.contentType || "image/png";
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

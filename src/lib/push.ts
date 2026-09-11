import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? "mailto:contato@conectalog.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  process.env.VAPID_PRIVATE_KEY ?? ""
);

/** Manda uma notificação push de verdade (toca som/vibra mesmo com o
 * app fechado, se o motoboy tiver ativado) pra todos os aparelhos que
 * esse motoboy já inscreveu. Silenciosamente ignora quando ele nunca
 * ativou (0 inscrições) — push é sempre um "bônus" sobre a notificação
 * in-app (Notificacao), nunca o único jeito de avisar. Apaga sozinha
 * qualquer inscrição que o navegador rejeitar (410/404 — permissão
 * revogada, aparelho trocado), pra não ficar tentando pra sempre numa
 * inscrição morta. */
export async function enviarPushMotoboy(
  motoboyId: number,
  payload: { titulo: string; corpo: string; url?: string }
): Promise<void> {
  if (!process.env.VAPID_PRIVATE_KEY) return;

  const inscricoes = await prisma.pushSubscription.findMany({ where: { motoboyId } });
  if (inscricoes.length === 0) return;

  const corpoJson = JSON.stringify({
    titulo: payload.titulo,
    corpo: payload.corpo,
    url: payload.url ?? "/app/inicio",
  });

  await Promise.all(
    inscricoes.map(async (inscricao) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: inscricao.endpoint,
            keys: { p256dh: inscricao.p256dh, auth: inscricao.auth },
          },
          corpoJson
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: inscricao.id } }).catch(() => {});
        }
      }
    })
  );
}

import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

// setVapidDetails valida o formato das envs na hora (ex.: subject tem
// que ser uma URL/mailto válida) e lança synchronous se alguma vier
// errada — isso já derrubou a tela de escalar inteira uma vez (Vapid
// subject corrompido) só porque escala/actions.ts importa esse módulo.
// Nunca deixa isso acontecer nesse nível: só tenta configurar (uma vez,
// lazy) dentro de enviarPushMotoboy, e qualquer erro de configuração
// vira "push não disponível agora" em vez de derrubar quem chamou —
// push é sempre um bônus, nunca pode quebrar a ação principal (escalar,
// avisar etc.).
let vapidConfigurado = false;
function configurarVapidSeNecessario(): boolean {
  if (vapidConfigurado) return true;
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) return false;
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigurado = true;
    return true;
  } catch (err) {
    console.error("VAPID mal configurado, push desativado até corrigir as envs:", err);
    return false;
  }
}

/** Manda uma notificação push de verdade (toca som/vibra mesmo com o
 * app fechado, se o motoboy tiver ativado) pra todos os aparelhos que
 * esse motoboy já inscreveu. Silenciosamente ignora quando ele nunca
 * ativou (0 inscrições) ou quando o VAPID está mal configurado — push é
 * sempre um "bônus" sobre a notificação in-app (Notificacao), nunca o
 * único jeito de avisar nem algo que pode quebrar quem chamou. Apaga
 * sozinha qualquer inscrição que o navegador rejeitar (410/404 —
 * permissão revogada, aparelho trocado), pra não ficar tentando pra
 * sempre numa inscrição morta. */
export async function enviarPushMotoboy(
  motoboyId: number,
  payload: { titulo: string; corpo: string; url?: string }
): Promise<void> {
  if (!configurarVapidSeNecessario()) return;

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

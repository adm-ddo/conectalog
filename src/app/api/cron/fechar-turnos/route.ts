import { NextResponse } from "next/server";
import { fecharTurnosEsquecidos } from "@/lib/fechamento-automatico";

/** Chamada pelo Vercel Cron (ver vercel.json) duas vezes por dia — mesmo
 * espírito do fechar-turnos do extras-app: a segunda chamada é rede de
 * segurança caso a primeira falhe (deploy em andamento, erro transiente).
 * fecharTurnosEsquecidos é idempotente (só mexe em turno que ainda está
 * ABERTO e já passou do horário configurado de fim), então rodar duas
 * vezes no mesmo dia não tem efeito colateral quando a primeira já deu
 * conta. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const resultado = await fecharTurnosEsquecidos();
  return NextResponse.json({ ok: true, ...resultado });
}

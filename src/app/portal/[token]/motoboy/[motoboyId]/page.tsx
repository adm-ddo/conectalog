import { notFound } from "next/navigation";
import { resolverClientePortal } from "@/lib/portal";
import { prisma } from "@/lib/prisma";
import { dataISOBrasil, inicioDoDiaBrasil } from "@/lib/data";
import { baixarComoDataUrl } from "@/lib/blob";
import EquipamentoBadge from "@/components/EquipamentoBadge";
import WhatsAppLink from "@/components/WhatsAppLink";
import BotaoVoltar from "@/components/BotaoVoltar";

/** Cadastro básico do motoboy (foto grande, telefone, telefone de
 * emergência) — só acessível pro cliente se esse motoboy apareceu de
 * algum jeito pra ele hoje: escalado, com um turno de verdade aqui
 * (motoboy "livre" pode bater turno sem estar escalado antes, ver
 * turno/iniciar/actions.ts) ou fez um apoio aqui vindo de outro turno.
 * Sem isso o link viraria forma de bisbilhotar qualquer motoboy da
 * cooperativa direto pelo id. */
export default async function PortalMotoboyPage({
  params,
}: {
  params: Promise<{ token: string; motoboyId: string }>;
}) {
  const { token, motoboyId } = await params;
  const cliente = await resolverClientePortal(token);
  if (!cliente) notFound();

  const idMotoboy = Number(motoboyId);
  const inicioHoje = inicioDoDiaBrasil();
  const [escaladoHoje, turnoHoje, apoioHoje] = await Promise.all([
    prisma.escalaTurno.findFirst({
      where: { clienteId: cliente.id, motoboyId: idMotoboy, data: new Date(dataISOBrasil()) },
    }),
    prisma.turno.findFirst({
      where: { clienteId: cliente.id, motoboyId: idMotoboy, horaInicio: { gte: inicioHoje } },
    }),
    prisma.apoio.findFirst({
      where: { clienteId: cliente.id, criadoEm: { gte: inicioHoje }, turno: { motoboyId: idMotoboy } },
    }),
  ]);
  if (!escaladoHoje && !turnoHoje && !apoioHoje) notFound();

  const motoboy = await prisma.motoboy.findUnique({
    where: { id: idMotoboy },
    select: {
      nomeCompleto: true,
      telefoneCelular: true,
      telefoneEmergencia: true,
      tipoEquipamento: true,
      fotoPerfilUrl: true,
    },
  });
  if (!motoboy) notFound();

  const fotoDataUrl = motoboy.fotoPerfilUrl
    ? await baixarComoDataUrl(motoboy.fotoPerfilUrl).catch(() => null)
    : null;

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
      <BotaoVoltar />

      <div className="flex flex-col items-center gap-3">
        {fotoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL baixada do Blob privado, next/image não se aplica aqui
          <img
            src={fotoDataUrl}
            alt={`Foto de ${motoboy.nomeCompleto}`}
            className="h-32 w-32 rounded-full object-cover border border-stone-200"
          />
        ) : (
          <span className="h-32 w-32 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-4xl">
            {motoboy.nomeCompleto.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-navy-900 text-center">{motoboy.nomeCompleto}</h1>
          <EquipamentoBadge tipo={motoboy.tipoEquipamento} />
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-3 text-sm">
        <p className="flex items-center gap-1.5">
          <span className="text-stone-500">Celular:</span> {motoboy.telefoneCelular}
          <WhatsAppLink telefone={motoboy.telefoneCelular} />
        </p>
        <p>
          <span className="text-stone-500">Emergência:</span> {motoboy.telefoneEmergencia}
        </p>
      </div>
    </div>
  );
}

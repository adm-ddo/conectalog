import { notFound } from "next/navigation";
import Link from "next/link";
import { resolverClientePortal } from "@/lib/portal";
import { prisma } from "@/lib/prisma";
import { dataISOBrasil } from "@/lib/data";
import { baixarComoDataUrl } from "@/lib/blob";
import EquipamentoBadge from "@/components/EquipamentoBadge";

/** Cadastro básico do motoboy (foto grande, telefone, telefone de
 * emergência) — só acessível pro cliente se esse motoboy está escalado
 * pra ele hoje (mesma trava de segurança da foto na lista da escala,
 * pra um link não virar forma de bisbilhotar qualquer motoboy da
 * cooperativa). */
export default async function PortalMotoboyPage({
  params,
}: {
  params: Promise<{ token: string; motoboyId: string }>;
}) {
  const { token, motoboyId } = await params;
  const cliente = await resolverClientePortal(token);
  if (!cliente) notFound();

  const escaladoHoje = await prisma.escalaTurno.findFirst({
    where: { clienteId: cliente.id, motoboyId: Number(motoboyId), data: new Date(dataISOBrasil()) },
  });
  if (!escaladoHoje) notFound();

  const motoboy = await prisma.motoboy.findUnique({
    where: { id: Number(motoboyId) },
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
      <Link href={`/portal/${token}`} className="text-xs text-stone-500 hover:underline self-start">
        ← Voltar
      </Link>

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
        <p>
          <span className="text-stone-500">Celular:</span> {motoboy.telefoneCelular}
        </p>
        <p>
          <span className="text-stone-500">Emergência:</span> {motoboy.telefoneEmergencia}
        </p>
      </div>
    </div>
  );
}

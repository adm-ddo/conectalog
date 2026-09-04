import { notFound } from "next/navigation";
import Link from "next/link";
import { resolverClientePortal } from "@/lib/portal";
import { prisma } from "@/lib/prisma";
import { dataISOBrasil, diaSemanaBrasil, formatarHora } from "@/lib/data";
import { resumoDiaCliente } from "@/lib/resumoDia";
import { baixarComoDataUrl } from "@/lib/blob";
import EquipamentoBadge from "@/components/EquipamentoBadge";
import ResumoDiaClienteCard from "@/components/ResumoDiaClienteCard";
import WhatsAppLink from "@/components/WhatsAppLink";
import type { TipoEquipamento } from "@/generated/prisma/enums";

export default async function PortalEscalaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const cliente = await resolverClientePortal(token);
  if (!cliente) notFound();

  const [escalas, resumoDia] = await Promise.all([
    prisma.escalaTurno.findMany({
      where: { clienteId: cliente.id, data: new Date(dataISOBrasil()) },
      include: {
        motoboy: {
          select: {
            nomeCompleto: true,
            tipoEquipamento: true,
            telefoneCelular: true,
            fotoPerfilUrl: true,
          },
        },
        turnoVinculado: { select: { id: true, horaInicio: true, avaliacao: { select: { nota: true } } } },
      },
      orderBy: [{ turno: "asc" }, { criadoEm: "asc" }],
    }),
    resumoDiaCliente(cliente.id),
  ]);

  // Foto de perfil fica privada no Blob — baixa aqui no servidor (já
  // sabendo que esse motoboy está escalado pra esse cliente hoje) e
  // embute como data URL, igual já acontece no painel da cooperativa.
  // Serve pro cliente conferir na hora que é mesmo quem foi escalado.
  const fotosPorMotoboy = new Map<string, string>();
  await Promise.all(
    escalas
      .filter((e) => e.motoboy.fotoPerfilUrl)
      .map(async (e) => {
        if (fotosPorMotoboy.has(e.motoboy.fotoPerfilUrl!)) return;
        try {
          const dataUrl = await baixarComoDataUrl(e.motoboy.fotoPerfilUrl!);
          fotosPorMotoboy.set(e.motoboy.fotoPerfilUrl!, dataUrl);
        } catch {
          // Sem foto pra mostrar — cai pro círculo com a inicial do nome.
        }
      })
  );

  const manha = escalas.filter((e) => e.turno === "MANHA");
  const tarde = escalas.filter((e) => e.turno === "TARDE");
  const noite = escalas.filter((e) => e.turno === "NOITE");
  const diaSemana = diaSemanaBrasil();
  const contratadasManha = cliente.motosFixasManha[diaSemana];
  const contratadasTarde = cliente.motosFixasTarde[diaSemana];
  const contratadasNoite = cliente.motosFixasNoite[diaSemana];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-base font-semibold text-navy-900">
          Escala de hoje{" "}
          <span className="font-normal text-stone-500">
            ·{" "}
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              timeZone: "America/Sao_Paulo",
            })}
          </span>
        </h1>
        <Link
          href={`/portal/${token}/apoio`}
          className="rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold px-3 py-1.5 transition-colors shrink-0"
        >
          🆘 Pedir apoio
        </Link>
      </div>

      <ResumoDiaClienteCard {...resumoDia} />

      {cliente.turnoManhaAtivo && (
        <SecaoTurno
          token={token}
          titulo="Manhã"
          itens={manha}
          contratadas={contratadasManha}
          fotosPorMotoboy={fotosPorMotoboy}
        />
      )}
      {cliente.turnoTardeAtivo && (
        <SecaoTurno
          token={token}
          titulo="Tarde"
          itens={tarde}
          contratadas={contratadasTarde}
          fotosPorMotoboy={fotosPorMotoboy}
        />
      )}
      {cliente.turnoNoiteAtivo && (
        <SecaoTurno
          token={token}
          titulo="Noite"
          itens={noite}
          contratadas={contratadasNoite}
          fotosPorMotoboy={fotosPorMotoboy}
        />
      )}
    </div>
  );
}

function SecaoTurno({
  token,
  titulo,
  itens,
  contratadas,
  fotosPorMotoboy,
}: {
  token: string;
  titulo: string;
  itens: {
    id: number;
    motoboyId: number;
    motoboy: {
      nomeCompleto: string;
      tipoEquipamento: TipoEquipamento | null;
      telefoneCelular: string;
      fotoPerfilUrl: string | null;
    };
    turnoVinculado: { id: number; horaInicio: Date; avaliacao: { nota: number } | null } | null;
  }[];
  contratadas: number;
  fotosPorMotoboy: Map<string, string>;
}) {
  const presentes = itens.filter((e) => e.turnoVinculado).length;
  const moto = (n: number) => `moto${n === 1 ? "" : "s"}`;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-navy-900">{titulo}</h2>
        {contratadas > 0 && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
              itens.length >= contratadas
                ? "bg-brand-100 text-brand-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {itens.length} de {contratadas}
          </span>
        )}
      </div>
      <p className="text-sm sm:text-base text-navy-900 leading-snug">
        {contratadas > 0 ? (
          <>
            Hoje a previsão é de <strong>{contratadas}</strong> {moto(contratadas)}, sendo que temos{" "}
            <strong>{itens.length}</strong> escalada{itens.length === 1 ? "" : "s"}
            {itens.length > 0 && (
              <>
                {" "}
                e <strong>{presentes}</strong> já {presentes === 1 ? "está" : "estão"} disponíve
                {presentes === 1 ? "l" : "is"}
              </>
            )}
            .
          </>
        ) : itens.length > 0 ? (
          <>
            Hoje temos <strong>{itens.length}</strong> {moto(itens.length)} escalada
            {itens.length === 1 ? "" : "s"}, e <strong>{presentes}</strong> já{" "}
            {presentes === 1 ? "está" : "estão"} disponíve{presentes === 1 ? "l" : "is"}.
          </>
        ) : (
          <>Nenhuma moto configurada nem escalada pra hoje.</>
        )}
      </p>
      {itens.length === 0 ? (
        <p className="text-sm text-stone-500">Ninguém escalado pra esse turno hoje.</p>
      ) : (
        <ul className="flex flex-col gap-1.5 overflow-x-auto">
          {itens.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-2.5 rounded-xl border border-stone-100 px-2.5 py-1.5 w-max min-w-full"
            >
              <FotoMotoboy
                token={token}
                motoboyId={e.motoboyId}
                nome={e.motoboy.nomeCompleto}
                dataUrl={e.motoboy.fotoPerfilUrl ? fotosPorMotoboy.get(e.motoboy.fotoPerfilUrl) : undefined}
              />
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  e.turnoVinculado ? "bg-brand-500" : "bg-stone-300"
                }`}
              />
              <span className="text-sm font-semibold text-navy-900 whitespace-nowrap">
                {e.motoboy.nomeCompleto}
              </span>
              <EquipamentoBadge tipo={e.motoboy.tipoEquipamento} />
              <span className="text-sm text-stone-500 whitespace-nowrap flex items-center gap-1.5">
                {e.motoboy.telefoneCelular}
                <WhatsAppLink telefone={e.motoboy.telefoneCelular} />
              </span>
              {e.turnoVinculado && (
                <span className="text-sm text-stone-500 whitespace-nowrap">
                  Chegou às {formatarHora(e.turnoVinculado.horaInicio)}
                </span>
              )}
              <span className="ml-auto shrink-0 pl-3">
                {e.turnoVinculado?.avaliacao ? (
                  <span className="text-xs text-stone-500 whitespace-nowrap">
                    {"★".repeat(e.turnoVinculado.avaliacao.nota)} avaliado
                  </span>
                ) : e.turnoVinculado ? (
                  <Link
                    href={`/portal/${token}/encerrar/${e.turnoVinculado.id}`}
                    className="text-xs font-semibold text-brand-700 hover:underline whitespace-nowrap"
                  >
                    Encerrar e avaliar
                  </Link>
                ) : (
                  <span className="text-xs text-stone-500 whitespace-nowrap">Aguardando</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Foto do motoboy, pro cliente conferir que é mesmo quem foi escalado
 * quando ele chegar. Clicável pra abrir o cadastro básico dele (telefone,
 * telefone de emergência); sem foto, cai num círculo com a inicial do
 * nome (mesmo padrão do resto do app quando não tem foto). */
function FotoMotoboy({
  token,
  motoboyId,
  nome,
  dataUrl,
}: {
  token: string;
  motoboyId: number;
  nome: string;
  dataUrl: string | undefined;
}) {
  return (
    <Link href={`/portal/${token}/motoboy/${motoboyId}`} className="shrink-0">
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL baixada do Blob privado, next/image não se aplica aqui
        <img
          src={dataUrl}
          alt={`Foto de ${nome}`}
          className="h-9 w-9 rounded-full object-cover border border-stone-200"
        />
      ) : (
        <span className="h-9 w-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
          {nome.slice(0, 1).toUpperCase()}
        </span>
      )}
    </Link>
  );
}

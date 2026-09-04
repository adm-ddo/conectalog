import { notFound } from "next/navigation";
import Link from "next/link";
import { resolverClientePortal } from "@/lib/portal";
import { prisma } from "@/lib/prisma";
import { dataISOBrasil, diaSemanaBrasil, inicioDoDiaBrasil, formatarHora } from "@/lib/data";
import { resumoDiaCliente } from "@/lib/resumoDia";
import { baixarComoDataUrl } from "@/lib/blob";
import { turnoAtivoAgora, type TurnoAtual } from "@/lib/equipe";
import EquipamentoBadge from "@/components/EquipamentoBadge";
import ResumoDiaClienteCard from "@/components/ResumoDiaClienteCard";
import WhatsAppLink from "@/components/WhatsAppLink";
import type { TipoEquipamento } from "@/generated/prisma/enums";

type ItemPresenca = {
  chave: string;
  motoboyId: number;
  motoboy: {
    nomeCompleto: string;
    tipoEquipamento: TipoEquipamento | null;
    telefoneCelular: string;
    fotoPerfilUrl: string | null;
  };
  turnoVinculado: { id: number; horaInicio: Date; avaliacao: { nota: number } | null } | null;
  escalado: boolean;
  balde: TurnoAtual;
};

export default async function PortalEscalaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const cliente = await resolverClientePortal(token);
  if (!cliente) notFound();

  const selecaoMotoboy = {
    nomeCompleto: true,
    tipoEquipamento: true,
    telefoneCelular: true,
    fotoPerfilUrl: true,
  } as const;

  const [escalas, turnosHoje, resumoDia] = await Promise.all([
    prisma.escalaTurno.findMany({
      where: { clienteId: cliente.id, data: new Date(dataISOBrasil()) },
      include: {
        motoboy: { select: selecaoMotoboy },
        turnoVinculado: { select: { id: true, horaInicio: true, avaliacao: { select: { nota: true } } } },
      },
      orderBy: [{ turno: "asc" }, { criadoEm: "asc" }],
    }),
    // Turno de verdade pode existir sem nunca ter sido escalado — motoboy
    // "livre"/liberado pode bater o turno direto, sem passar pela escala
    // (ver comentário em turno/iniciar/actions.ts). Sem isso, quem chega
    // assim simplesmente não aparecia em lugar nenhum aqui no portal,
    // mesmo já estando fisicamente no cliente.
    prisma.turno.findMany({
      where: { clienteId: cliente.id, horaInicio: { gte: inicioDoDiaBrasil() } },
      select: {
        id: true,
        motoboyId: true,
        horaInicio: true,
        turnoPredefinido: true,
        motoboy: { select: selecaoMotoboy },
        avaliacao: { select: { nota: true } },
      },
    }),
    resumoDiaCliente(cliente.id),
  ]);

  const itensEscalados = escalas.map((e) => ({
    chave: `escala-${e.id}`,
    motoboyId: e.motoboyId,
    motoboy: e.motoboy,
    turnoVinculado: e.turnoVinculado,
    escalado: true,
    // Escala sempre vem com um turno de verdade (nunca "LIVRE").
    balde: e.turno as TurnoAtual,
  }));

  const idsTurnoJaEscalado = new Set(
    escalas.map((e) => e.turnoVinculado?.id).filter((id): id is number => id != null)
  );
  const itensSemEscala = turnosHoje
    .filter((t) => !idsTurnoJaEscalado.has(t.id))
    .map((t) => ({
      chave: `turno-${t.id}`,
      motoboyId: t.motoboyId,
      motoboy: t.motoboy,
      turnoVinculado: { id: t.id, horaInicio: t.horaInicio, avaliacao: t.avaliacao },
      escalado: false,
      // Quem chegou sem escala pode ter escolhido "Livre" no app — nesse
      // caso, descobre o balde pelo horário de chegada dele batendo com
      // a janela configurada desse cliente (mesma lógica de "que turno
      // está rolando agora", só que aplicada à hora que ELE chegou, não
      // a agora).
      balde:
        t.turnoPredefinido !== "LIVRE"
          ? (t.turnoPredefinido as TurnoAtual)
          : turnoAtivoAgora(cliente, t.horaInicio),
    }));

  const todosItens: ItemPresenca[] = [...itensEscalados, ...itensSemEscala];
  const manha = todosItens.filter((i) => i.balde === "MANHA");
  const tarde = todosItens.filter((i) => i.balde === "TARDE");
  const noite = todosItens.filter((i) => i.balde === "NOITE");
  const semEscalaForaDeHorario = todosItens.filter((i) => i.balde === null && !i.escalado);

  // Foto de perfil fica privada no Blob — baixa aqui no servidor (já
  // sabendo que esse motoboy apareceu de algum jeito pra esse cliente
  // hoje) e embute como data URL, igual já acontece no painel da
  // cooperativa. Serve pro cliente conferir na hora que é mesmo quem foi
  // escalado (ou reconhecer quem chegou sem estar na escala).
  const fotosPorMotoboy = new Map<string, string>();
  await Promise.all(
    todosItens
      .filter((i) => i.motoboy.fotoPerfilUrl)
      .map(async (i) => {
        if (fotosPorMotoboy.has(i.motoboy.fotoPerfilUrl!)) return;
        try {
          const dataUrl = await baixarComoDataUrl(i.motoboy.fotoPerfilUrl!);
          fotosPorMotoboy.set(i.motoboy.fotoPerfilUrl!, dataUrl);
        } catch {
          // Sem foto pra mostrar — cai pro círculo com a inicial do nome.
        }
      })
  );

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

      <ResumoDiaClienteCard
        {...resumoDia}
        hrefMotoboy={(motoboyId) => `/portal/${token}/motoboy/${motoboyId}`}
      />

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
      {semEscalaForaDeHorario.length > 0 && (
        <SecaoTurno
          token={token}
          titulo="Fora do horário"
          itens={semEscalaForaDeHorario}
          contratadas={0}
          fotosPorMotoboy={fotosPorMotoboy}
          textoPersonalizado="Chegaram sem estar escalados, fora dos turnos configurados."
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
  textoPersonalizado,
}: {
  token: string;
  titulo: string;
  itens: ItemPresenca[];
  contratadas: number;
  fotosPorMotoboy: Map<string, string>;
  textoPersonalizado?: string;
}) {
  const escaladas = itens.filter((i) => i.escalado).length;
  const presentes = itens.filter((i) => i.turnoVinculado).length;
  const moto = (n: number) => `moto${n === 1 ? "" : "s"}`;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-navy-900">{titulo}</h2>
        {contratadas > 0 && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
              escaladas >= contratadas ? "bg-brand-100 text-brand-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            {escaladas} de {contratadas}
          </span>
        )}
      </div>
      <p className="text-sm sm:text-base text-navy-900 leading-snug">
        {textoPersonalizado ? (
          textoPersonalizado
        ) : contratadas > 0 ? (
          <>
            Hoje a previsão é de <strong>{contratadas}</strong> {moto(contratadas)}, sendo que temos{" "}
            <strong>{escaladas}</strong> escalada{escaladas === 1 ? "" : "s"}
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
            Hoje temos <strong>{escaladas}</strong> {moto(escaladas)} escalada
            {escaladas === 1 ? "" : "s"}, e <strong>{presentes}</strong> já{" "}
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
          {itens.map((i) => (
            <li
              key={i.chave}
              className="flex items-center gap-2.5 rounded-xl border border-stone-100 px-2.5 py-1.5 w-max min-w-full"
            >
              <FotoMotoboy
                token={token}
                motoboyId={i.motoboyId}
                nome={i.motoboy.nomeCompleto}
                dataUrl={i.motoboy.fotoPerfilUrl ? fotosPorMotoboy.get(i.motoboy.fotoPerfilUrl) : undefined}
              />
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  i.turnoVinculado ? "bg-brand-500" : "bg-stone-300"
                }`}
              />
              <span className="text-sm font-semibold text-navy-900 whitespace-nowrap">
                {i.motoboy.nomeCompleto}
              </span>
              <EquipamentoBadge tipo={i.motoboy.tipoEquipamento} />
              {!i.escalado && (
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 whitespace-nowrap">
                  Sem escala
                </span>
              )}
              <span className="text-sm text-stone-500 whitespace-nowrap flex items-center gap-1.5">
                {i.motoboy.telefoneCelular}
                <WhatsAppLink telefone={i.motoboy.telefoneCelular} />
              </span>
              {i.turnoVinculado && (
                <span className="text-sm text-stone-500 whitespace-nowrap">
                  Chegou às {formatarHora(i.turnoVinculado.horaInicio)}
                </span>
              )}
              <span className="ml-auto shrink-0 pl-3">
                {i.turnoVinculado?.avaliacao ? (
                  <span className="text-xs text-stone-500 whitespace-nowrap">
                    {"★".repeat(i.turnoVinculado.avaliacao.nota)} avaliado
                  </span>
                ) : i.turnoVinculado ? (
                  <Link
                    href={`/portal/${token}/encerrar/${i.turnoVinculado.id}`}
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
 * (ou reconhecer quem chegou sem estar na escala) quando ele chegar.
 * Clicável pra abrir o cadastro básico dele (telefone, telefone de
 * emergência); sem foto, cai num círculo com a inicial do nome (mesmo
 * padrão do resto do app quando não tem foto). */
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

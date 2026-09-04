import { notFound } from "next/navigation";
import { requireTenantCompleto } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { baixarComoDataUrl } from "@/lib/blob";
import { formatarDataHora } from "@/lib/data";
import { formatarMoeda } from "@/lib/valores";
import { LABEL_TURNO } from "@/lib/equipe";
import EquipamentoBadge from "@/components/EquipamentoBadge";
import BotaoVoltar from "@/components/BotaoVoltar";

const LABEL_STATUS: Record<string, string> = {
  ABERTO: "Aberto",
  CONCLUIDO: "Concluído",
  PAGO: "Pago",
};

export default async function TurnoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sessao = await requireTenantCompleto();
  const turnoId = Number((await params).id);

  const turno = await prisma.turno.findFirst({
    where: { id: turnoId, motoboy: { empresaId: sessao.empresaEfetivoId } },
    include: {
      motoboy: { select: { nomeCompleto: true, tipoEquipamento: true } },
      cliente: { select: { nome: true } },
      apoios: { include: { cliente: { select: { nome: true } } } },
      taxaExtraItens: { orderBy: { ordem: "asc" } },
      resolvidoPorUsuario: { select: { nome: true } },
    },
  });
  if (!turno) notFound();

  // Fotos e assinaturas ficam privadas no Blob — só dá pra exibir baixando
  // aqui no servidor (já confirmado que o turno é da cooperativa de quem
  // está logado) e embutindo como data URL, mesmo padrão do perfil do
  // motoboy.
  const [fotoInicio, fotoFim, assinaturaTermo, assinaturaRecibo] = await Promise.all([
    baixarComoDataUrl(turno.fotoInicioUrl).catch(() => null),
    turno.fotoFimUrl ? baixarComoDataUrl(turno.fotoFimUrl).catch(() => null) : null,
    baixarComoDataUrl(turno.assinaturaTermoUrl).catch(() => null),
    turno.assinaturaReciboUrl ? baixarComoDataUrl(turno.assinaturaReciboUrl).catch(() => null) : null,
  ]);

  const turnoLabel = LABEL_TURNO[turno.turnoPredefinido as keyof typeof LABEL_TURNO] ?? "livre";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <BotaoVoltar />
        <h1 className="text-2xl font-semibold text-navy-900 mt-2 flex items-center gap-2">
          {turno.motoboy.nomeCompleto}
          <EquipamentoBadge tipo={turno.motoboy.tipoEquipamento} />
        </h1>
        <p className="text-stone-600 mt-1 text-sm">
          {turno.cliente.nome} · turno da {turnoLabel} · {LABEL_STATUS[turno.status]}
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <p>
          <span className="text-stone-500">Início:</span> {formatarDataHora(turno.horaInicio)}
        </p>
        <p>
          <span className="text-stone-500">Fim:</span>{" "}
          {turno.horaFim ? formatarDataHora(turno.horaFim) : "ainda em aberto"}
        </p>
        <p>
          <span className="text-stone-500">Bandas (motoboy):</span> {turno.quantidadeBandas}
          {turno.quantidadeBandasCliente !== null &&
            turno.quantidadeBandasCliente !== turno.quantidadeBandas &&
            ` — cliente informou ${turno.quantidadeBandasCliente}`}
        </p>
        <p>
          <span className="text-stone-500">Motoboy recebe:</span>{" "}
          {turno.valorTotal ? `R$ ${formatarMoeda(turno.valorTotal)}` : "—"}
        </p>
        <p>
          <span className="text-stone-500">Cooperativa cobra do cliente:</span>{" "}
          {turno.valorCobradoCliente ? `R$ ${formatarMoeda(turno.valorCobradoCliente)}` : "—"}
        </p>
      </div>

      {turno.resolvidoDivergenciaEm && turno.quantidadeBandasMotoboyOriginal !== null && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-amber-800">Divergência resolvida</h2>
          <p className="text-sm text-amber-800">
            Motoboy informou {turno.quantidadeBandasMotoboyOriginal} bandas, cliente informou{" "}
            {turno.quantidadeBandasCliente} — combinado em {turno.quantidadeBandas} bandas por{" "}
            {turno.resolvidoPorUsuario?.nome ?? "alguém da cooperativa"} em{" "}
            {formatarDataHora(turno.resolvidoDivergenciaEm)}.
          </p>
          {turno.taxaExtraItens
            .filter((item) => item.quantidadeMotoboyOriginal !== null && item.quantidadeMotoboyOriginal !== item.quantidade)
            .map((item) => (
              <p key={item.id} className="text-sm text-amber-800">
                {item.descricao}: motoboy informou {item.quantidadeMotoboyOriginal}, cliente informou{" "}
                {item.quantidadeCliente} — combinado em {item.quantidade}.
              </p>
            ))}
          {turno.observacaoDivergencia && (
            <p className="text-sm text-amber-800 italic">“{turno.observacaoDivergencia}”</p>
          )}
        </div>
      )}

      {turno.taxaExtraItens.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-navy-900 mb-3">Taxas extras</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {turno.taxaExtraItens.map((item) => (
              <li key={item.id} className="flex justify-between text-stone-700">
                <span>{item.descricao}</span>
                <span>
                  {item.quantidade}
                  {item.quantidadeCliente !== null &&
                    item.quantidadeCliente !== item.quantidade &&
                    ` (cliente informou ${item.quantidadeCliente})`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-navy-900">Início do turno</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FotoOuAusente titulo="Foto de início" dataUrl={fotoInicio} />
          <FotoOuAusente titulo="Assinatura do termo" dataUrl={assinaturaTermo} contida />
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-navy-900">Fim do turno</h2>
        {turno.status === "ABERTO" ? (
          <p className="text-sm text-stone-400">Turno ainda não foi encerrado.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FotoOuAusente titulo="Foto de fim" dataUrl={fotoFim} />
            <FotoOuAusente titulo="Assinatura do recibo" dataUrl={assinaturaRecibo} contida />
          </div>
        )}
      </div>

      {turno.apoios.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-navy-900 mb-3">Apoios feitos nesse turno</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {turno.apoios.map((a) => (
              <li key={a.id} className="flex justify-between text-stone-700">
                <span>{a.cliente.nome}</span>
                <span>
                  {a.quantidadeBandas} bandas · R$ {formatarMoeda(a.valorTotal)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FotoOuAusente({
  titulo,
  dataUrl,
  contida,
}: {
  titulo: string;
  dataUrl: string | null;
  contida?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-stone-500">{titulo}</span>
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL baixada do Blob privado, next/image não se aplica
        <img
          src={dataUrl}
          alt={titulo}
          className={`w-full rounded-xl border border-stone-200 ${
            contida ? "object-contain bg-white h-48" : "object-cover h-64"
          }`}
        />
      ) : (
        <p className="text-sm text-stone-400">Não disponível.</p>
      )}
    </div>
  );
}

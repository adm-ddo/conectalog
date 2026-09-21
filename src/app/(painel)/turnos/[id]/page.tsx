import { notFound } from "next/navigation";
import { requireTenantCompleto } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { baixarComoDataUrl } from "@/lib/blob";
import { formatarDataHora, diaSemanaBrasil } from "@/lib/data";
import { formatarMoeda, paraNumero } from "@/lib/valores";
import { LABEL_TURNO } from "@/lib/equipe";
import { encontrarPerfilFixo } from "@/lib/precificacao";
import { horaFimConfiguradaTurno } from "@/lib/horarioTurnoFixo";
import { chegouAtrasado } from "@/lib/atrasoChegada";
import EquipamentoBadge from "@/components/EquipamentoBadge";
import BotaoVoltar from "@/components/BotaoVoltar";
import CorrigirContagemForm from "./CorrigirContagemForm";
import EncerrarManualForm from "./EncerrarManualForm";
import { PRAZO_CONFIRMACAO_MIN } from "@/lib/confirmacaoBandas";

/** Tolerância antes de liberar o botão de encerrar manualmente pelo
 * painel — bem mais curta que a carência de 2h do fechamento automático
 * por cron (fechamento-automatico.ts): aqui é a cooperativa decidindo
 * agir, não o sistema fechando sozinho, então 15min já é suficiente pra
 * saber que o motoboy não vai encerrar sozinho tão cedo (pedido do
 * Thiago). */
const TOLERANCIA_ENCERRAR_MANUAL_MIN = 15;

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
      cliente: {
        select: {
          nome: true,
          turnosFixos: true,
          turnoManhaAtivo: true,
          turnoManhaInicio: true,
          turnoManhaFim: true,
          turnoTardeAtivo: true,
          turnoTardeInicio: true,
          turnoTardeFim: true,
          turnoNoiteAtivo: true,
          turnoNoiteInicio: true,
          turnoNoiteFim: true,
          toleranciaChegadaMinutos: true,
        },
      },
      apoios: { include: { cliente: { select: { nome: true } } } },
      taxaExtraItens: { orderBy: { ordem: "asc" } },
      resolvidoPorUsuario: { select: { nome: true } },
      encerradoManualmentePorUsuario: { select: { nome: true } },
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

  // Só faz sentido corrigir enquanto os dois lados não baterem — se
  // batem (ou se o cliente nunca confirmou nada), fica valendo a
  // contagem do motoboy sem precisar de intervenção nenhuma; se
  // divergem, a cooperativa sempre pode reconciliar aqui, mesmo que já
  // tenha corrigido antes (não é uma ação de uso único).
  const bandasBatem = turno.quantidadeBandasCliente !== null && turno.quantidadeBandasCliente === turno.quantidadeBandas;
  const podeCorrigirContagem = turno.status !== "ABERTO" && !bandasBatem;
  const prazoClienteEncerrado =
    turno.horaFim !== null && new Date() > new Date(turno.horaFim.getTime() + PRAZO_CONFIRMACAO_MIN * 60_000);

  // Contexto do garantido desse turno específico (varia por turno e dia
  // da semana — ver ClienteTurnoFixo) pra dar transparência na hora de
  // corrigir a divergência: quantas entregas esse turno garante e quanto
  // vale cada uma a mais/a menos.
  const perfilFixoDivergencia =
    turno.turnoPredefinido !== "LIVRE"
      ? encontrarPerfilFixo(turno.cliente.turnosFixos, turno.turnoPredefinido, diaSemanaBrasil(turno.horaInicio))
      : null;

  // Botão de encerrar manualmente só aparece depois de passados 15min do
  // horário configurado de fim — turno LIVRE não tem horário configurado
  // (motoboy escolhe livremente), então nesse caso a cooperativa já pode
  // encerrar a qualquer momento (não tem "atraso" pra esperar).
  const atrasado = chegouAtrasado(
    turno.cliente,
    turno.turnoPredefinido !== "LIVRE" ? turno.turnoPredefinido : null,
    turno.horaInicio
  );

  const horaFimConfigurada = horaFimConfiguradaTurno(turno.cliente, turno.turnoPredefinido, turno.horaInicio);
  const podeEncerrarManualmente =
    turno.status === "ABERTO" &&
    (horaFimConfigurada === null ||
      new Date() > new Date(horaFimConfigurada.getTime() + TOLERANCIA_ENCERRAR_MANUAL_MIN * 60_000));

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

      {podeEncerrarManualmente && (
        <EncerrarManualForm
          turnoId={turno.id}
          turnoLabel={turnoLabel}
          bandasIncluidas={perfilFixoDivergencia?.bandasIncluidas ?? null}
          valorGarantidoMotoboy={perfilFixoDivergencia ? paraNumero(perfilFixoDivergencia.valorGarantidoMotoboy) : null}
          valorExcedenteMotoboy={perfilFixoDivergencia ? paraNumero(perfilFixoDivergencia.valorExcedenteMotoboy) : null}
          taxas={turno.taxaExtraItens.map((item) => ({
            itemId: item.id,
            descricao: item.descricao,
            valorMotoboyUnidade: paraNumero(item.valorMotoboyAplicado),
          }))}
        />
      )}

      {podeCorrigirContagem && (
        <CorrigirContagemForm
          turnoId={turno.id}
          turnoLabel={turnoLabel}
          bandasIncluidas={perfilFixoDivergencia?.bandasIncluidas ?? null}
          valorGarantidoMotoboy={perfilFixoDivergencia ? paraNumero(perfilFixoDivergencia.valorGarantidoMotoboy) : null}
          valorExcedenteMotoboy={perfilFixoDivergencia ? paraNumero(perfilFixoDivergencia.valorExcedenteMotoboy) : null}
          bandasMotoboy={turno.quantidadeBandas}
          bandasCliente={turno.quantidadeBandasCliente}
          prazoClienteEncerrado={prazoClienteEncerrado}
          taxas={turno.taxaExtraItens.map((item) => ({
            itemId: item.id,
            descricao: item.descricao,
            motoboy: item.quantidade,
            cliente: item.quantidadeCliente,
            valorMotoboyUnidade: paraNumero(item.valorMotoboyAplicado),
          }))}
        />
      )}

      <div className="rounded-2xl border border-stone-200 bg-white p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <p>
          <span className="text-stone-500">Início:</span>{" "}
          <span className={atrasado ? "text-red-600 font-semibold" : undefined}>
            {formatarDataHora(turno.horaInicio)}
            {atrasado && " · atrasado"}
          </span>
        </p>
        <p>
          <span className="text-stone-500">Fim:</span>{" "}
          {turno.horaFim ? formatarDataHora(turno.horaFim) : "ainda em aberto"}
        </p>
        <p>
          <span className="text-stone-500">Bandas (motoboy):</span> {turno.quantidadeBandas}
        </p>
        <p>
          <span className="text-stone-500">Bandas (cliente):</span>{" "}
          {turno.quantidadeBandasCliente ?? "ainda não confirmou"}
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

      {turno.encerradoManualmente && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          Encerrado manualmente por {turno.encerradoManualmentePorUsuario?.nome ?? "alguém da cooperativa"}
          {turno.encerradoManualmenteEm && <> em {formatarDataHora(turno.encerradoManualmenteEm)}</>} —{" "}
          {turno.quantidadeBandas} entrega{turno.quantidadeBandas === 1 ? "" : "s"}.
          {turno.observacaoEncerramentoManual && <> “{turno.observacaoEncerramentoManual}”</>}
        </div>
      )}

      {turno.fechamentoAutomatico && turno.resolvidoDivergenciaEm !== null && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 text-sm text-brand-800">
          {turno.resolvidoPorUsuario ? (
            <>
              Turno tinha fechado sozinho (motoboy não encerrou) — {turno.resolvidoPorUsuario.nome} corrigiu pra{" "}
              {turno.quantidadeBandas} entregas em {formatarDataHora(turno.resolvidoDivergenciaEm)}.
            </>
          ) : (
            <>
              Motoboy não encerrou dentro do prazo — o sistema fechou sozinho usando a contagem que
              o cliente informou no portal: {turno.quantidadeBandas} entregas.
            </>
          )}
        </div>
      )}

      {!turno.fechamentoAutomatico && turno.resolvidoDivergenciaEm && turno.quantidadeBandasMotoboyOriginal !== null && (
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

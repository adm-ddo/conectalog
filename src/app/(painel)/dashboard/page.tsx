import Link from "next/link";
import { requireTenant, clientesResponsaveisIds } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { turnoAtivoAgora, turnoRelevanteHoje, motosContratadasNoTurno, LABEL_TURNO } from "@/lib/equipe";
import { formatarHora, dataISOBrasil } from "@/lib/data";
import AutoRefresh from "@/components/AutoRefresh";
import SolicitacaoApoioAlert from "./SolicitacaoApoioAlert";
import DivergenciaRow from "./DivergenciaRow";
import { expirarEscalasVencidas } from "@/lib/escala";
import type { Prisma } from "@/generated/prisma/client";

export default async function DashboardPage() {
  const sessao = await requireTenant();

  await expirarEscalasVencidas(new Date(), { empresaId: sessao.empresaEfetivoId });

  // Gestor de campo só vê o que diz respeito aos clientes que ele é
  // responsável (ver MotoboyCliente.gestor) — dono/equipe normal vê tudo
  // da cooperativa, sem esse filtro.
  const idsResponsaveis = await clientesResponsaveisIds(sessao);
  const escopoGestor = sessao.role === "GESTOR_CAMPO";
  const filtroCliente: Prisma.ClienteWhereInput = escopoGestor
    ? { id: { in: idsResponsaveis } }
    : {};

  const hojeISO = dataISOBrasil();
  const hoje = new Date(hojeISO);

  const [turnosAbertos, escalasHoje, totalMotoboysAtivos, clientesAtivos, solicitacoesApoio, turnosDivergentes, turnosPendentes] =
    await Promise.all([
      prisma.turno.findMany({
        where: {
          status: "ABERTO",
          motoboy: { empresaId: sessao.empresaEfetivoId },
          cliente: filtroCliente,
        },
        select: { clienteId: true },
      }),
      prisma.escalaTurno.findMany({
        where: { data: hoje, cliente: { empresaId: sessao.empresaEfetivoId, ...filtroCliente } },
        select: { clienteId: true, turno: true, statusConfirmacao: true },
      }),
      escopoGestor
        ? prisma.motoboyCliente
            .findMany({
              where: { clienteId: { in: idsResponsaveis }, liberado: true },
              select: { motoboyId: true },
              distinct: ["motoboyId"],
            })
            .then((r) => r.length)
        : prisma.motoboy.count({ where: { empresaId: sessao.empresaEfetivoId, ativo: true } }),
      prisma.cliente.findMany({
        where: { empresaId: sessao.empresaEfetivoId, ativo: true, ...filtroCliente },
      }),
      prisma.solicitacaoApoio.findMany({
        where: {
          status: "PENDENTE",
          cliente: { empresaId: sessao.empresaEfetivoId, ...filtroCliente },
        },
        orderBy: { criadoEm: "asc" },
        include: { cliente: { select: { nome: true } } },
      }),
      prisma.turno.findMany({
        where: {
          motoboy: { empresaId: sessao.empresaEfetivoId },
          cliente: filtroCliente,
          // Só considera divergência depois que o motoboy também encerrou o
          // turno dele (status ABERTO = quantidadeBandas ainda no padrão 0,
          // porque o cliente pode fechar o portal antes ou depois — ver
          // comentário em encerrarPeloCliente). Sem esse filtro, fechar o
          // portal primeiro sempre criava uma "divergência" falsa contra o
          // 0 provisório, e resolver isso cedo demais escondia pra sempre
          // uma divergência de verdade contra o número final do motoboy.
          status: { not: "ABERTO" },
          resolvidoDivergenciaEm: null,
          quantidadeBandasCliente: { not: null },
        },
        include: {
          motoboy: { select: { nomeCompleto: true } },
          cliente: { select: { nome: true } },
          taxaExtraItens: { orderBy: { ordem: "asc" } },
        },
      }),
      // Correção de fechamento automático é bloqueada pra Gestor de campo
      // (mesma tela /turnos/[id] usa requireTenantCompleto) — nem conta
      // pra esse papel, senão o alerta apontaria pra um lugar que ele não
      // pode abrir.
      escopoGestor
        ? Promise.resolve(0)
        : prisma.turno.count({
            where: {
              motoboy: { empresaId: sessao.empresaEfetivoId },
              fechamentoAutomatico: true,
              resolvidoDivergenciaEm: null,
            },
          }),
    ]);

  const divergencias = turnosDivergentes.filter(
    (t) =>
      t.quantidadeBandasCliente !== t.quantidadeBandas ||
      t.taxaExtraItens.some((item) => item.quantidade !== (item.quantidadeCliente ?? 0))
  );

  const presentesPorCliente = new Map<number, number>();
  for (const t of turnosAbertos) {
    presentesPorCliente.set(t.clienteId, (presentesPorCliente.get(t.clienteId) ?? 0) + 1);
  }

  // Motos necessárias hoje somando os 3 turnos de cada cliente (não só o
  // que tá rolando agora) — o número que a cooperativa precisa bater ao
  // montar a escala do dia inteiro. Guardado também por turno, pra dar
  // pra ver de relance se o buraco é de manhã, tarde ou noite.
  const contratadasPorTurno = { MANHA: 0, TARDE: 0, NOITE: 0 };
  for (const cliente of clientesAtivos) {
    if (cliente.turnoManhaAtivo) contratadasPorTurno.MANHA += motosContratadasNoTurno(cliente, "MANHA");
    if (cliente.turnoTardeAtivo) contratadasPorTurno.TARDE += motosContratadasNoTurno(cliente, "TARDE");
    if (cliente.turnoNoiteAtivo) contratadasPorTurno.NOITE += motosContratadasNoTurno(cliente, "NOITE");
  }
  const totalContratadasHoje =
    contratadasPorTurno.MANHA + contratadasPorTurno.TARDE + contratadasPorTurno.NOITE;

  const escaladasPorTurno = {
    MANHA: escalasHoje.filter((e) => e.turno === "MANHA").length,
    TARDE: escalasHoje.filter((e) => e.turno === "TARDE").length,
    NOITE: escalasHoje.filter((e) => e.turno === "NOITE").length,
  };
  const totalEscaladasHoje = escalasHoje.length;
  const confirmadasHoje = escalasHoje.filter((e) => e.statusConfirmacao === "CONFIRMADO").length;
  const pendentesHoje = escalasHoje.filter((e) => e.statusConfirmacao === "PENDENTE").length;
  const recusadasHoje = escalasHoje.filter((e) => e.statusConfirmacao === "RECUSADO").length;
  const expiradasHoje = escalasHoje.filter((e) => e.statusConfirmacao === "EXPIRADA").length;

  const resumoClientes = clientesAtivos
    .map((cliente) => {
      // As 4 métricas do card são todas do MESMO turno — o que está
      // rolando agora, ou (fora da janela) o próximo que vai começar
      // hoje (ver turnoRelevanteHoje) — nunca a soma dos 3 turnos do
      // dia. Somar dava um número "contratadas" sem sentido pra cliente
      // com mais de um turno ativo (ex.: 1 de manhã + 4 de tarde + 1 de
      // noite virava "6 contratadas", que não bate com nenhum turno de
      // verdade) — e mostrar sempre o turno atual (só o que já está
      // rolando) zerava tudo fora da janela, escondendo quem já tinha
      // sido escalado pro turno seguinte.
      const turnoAtual = turnoAtivoAgora(cliente);
      const turnoRelevante = turnoRelevanteHoje(cliente);
      const contratadas = motosContratadasNoTurno(cliente, turnoRelevante);
      const escalasDoTurno = turnoRelevante
        ? escalasHoje.filter((e) => e.clienteId === cliente.id && e.turno === turnoRelevante)
        : [];
      return {
        id: cliente.id,
        nome: cliente.nome,
        turnoAtual,
        turnoRelevante,
        contratadas,
        escaladas: escalasDoTurno.length,
        confirmadas: escalasDoTurno.filter((e) => e.statusConfirmacao === "CONFIRMADO").length,
        presentes: presentesPorCliente.get(cliente.id) ?? 0,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh />
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Dashboard</h1>
        <p className="text-stone-600 mt-1 text-sm">
          {escopoGestor
            ? "Visão geral dos clientes que você é responsável."
            : "Visão geral da operação agora."}
        </p>
      </div>

      <SolicitacaoApoioAlert
        solicitacoes={solicitacoesApoio.map((s) => ({
          id: s.id,
          quantidade: s.quantidade,
          clienteNome: s.cliente.nome,
          criadoEm: formatarHora(s.criadoEm),
        }))}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">
            {escopoGestor ? "Seus clientes" : "Clientes ativos"}
          </p>
          <p className="text-3xl font-bold text-navy-900 mt-1">{clientesAtivos.length}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">
            Motos necessárias hoje
          </p>
          <p className="text-3xl font-bold text-navy-900 mt-1">{totalContratadasHoje}</p>
          <p className="text-[11px] text-stone-500 mt-1">
            Manhã {contratadasPorTurno.MANHA} · Tarde {contratadasPorTurno.TARDE} · Noite{" "}
            {contratadasPorTurno.NOITE}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">
            Motos escaladas hoje
          </p>
          <p
            className={`text-3xl font-bold mt-1 ${
              totalEscaladasHoje < totalContratadasHoje ? "text-red-600" : "text-navy-900"
            }`}
          >
            {totalEscaladasHoje}
          </p>
          <p className="text-[11px] text-stone-500 mt-1">
            <span className={escaladasPorTurno.MANHA < contratadasPorTurno.MANHA ? "text-red-600" : ""}>
              Manhã {escaladasPorTurno.MANHA}
            </span>
            {" · "}
            <span className={escaladasPorTurno.TARDE < contratadasPorTurno.TARDE ? "text-red-600" : ""}>
              Tarde {escaladasPorTurno.TARDE}
            </span>
            {" · "}
            <span className={escaladasPorTurno.NOITE < contratadasPorTurno.NOITE ? "text-red-600" : ""}>
              Noite {escaladasPorTurno.NOITE}
            </span>
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">
            {escopoGestor ? "Motoboys na sua equipe" : "Motoboys ativos"}
          </p>
          <p className="text-3xl font-bold text-navy-900 mt-1">{totalMotoboysAtivos}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Link
          href="/dashboard/confirmacoes?status=CONFIRMADO"
          className="rounded-2xl border border-stone-200 bg-white p-5 hover:border-brand-300 hover:shadow-sm transition"
        >
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">
            Já confirmaram
          </p>
          <p className="text-3xl font-bold text-brand-700 mt-1">{confirmadasHoje}</p>
        </Link>
        <Link
          href="/dashboard/confirmacoes?status=PENDENTE"
          className="rounded-2xl border border-stone-200 bg-white p-5 hover:border-brand-300 hover:shadow-sm transition"
        >
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">
            Ainda não responderam
          </p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{pendentesHoje}</p>
        </Link>
        <Link
          href="/dashboard/confirmacoes?status=RECUSADO"
          className="rounded-2xl border border-stone-200 bg-white p-5 hover:border-brand-300 hover:shadow-sm transition"
        >
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">Recusaram</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{recusadasHoje}</p>
        </Link>
        <Link
          href="/dashboard/confirmacoes?status=EXPIRADA"
          className="rounded-2xl border border-stone-200 bg-white p-5 hover:border-brand-300 hover:shadow-sm transition"
        >
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">
            Não confirmaram a tempo
          </p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{expiradasHoje}</p>
        </Link>
        <Link
          href="/dashboard/ativos"
          className="rounded-2xl border border-stone-200 bg-white p-5 hover:border-brand-300 hover:shadow-sm transition"
        >
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">
            Ativos agora
          </p>
          <p className="text-3xl font-bold text-navy-900 mt-1">{turnosAbertos.length}</p>
        </Link>
      </div>

      {divergencias.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-red-700">
            Divergência entre motoboy e cliente ({divergencias.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {divergencias.map((t) => (
              <DivergenciaRow
                key={t.id}
                turnoId={t.id}
                nomeMotoboy={t.motoboy.nomeCompleto}
                nomeCliente={t.cliente.nome}
                bandasMotoboy={t.quantidadeBandas}
                bandasCliente={t.quantidadeBandasCliente ?? 0}
                taxas={t.taxaExtraItens.map((item) => ({
                  itemId: item.id,
                  descricao: item.descricao,
                  motoboy: item.quantidade,
                  cliente: item.quantidadeCliente ?? 0,
                }))}
              />
            ))}
          </ul>
        </div>
      )}

      {turnosPendentes > 0 && (
        <Link
          href="/turnos/pendentes"
          className="rounded-2xl border border-amber-300 bg-amber-50 p-5 flex items-center justify-between gap-3 hover:border-amber-400 transition-colors"
        >
          <div>
            <h2 className="text-sm font-semibold text-amber-800">
              Turnos pendentes de confirmação ({turnosPendentes})
            </h2>
            <p className="text-xs text-amber-800 mt-1">
              Motoboy não encerrou e o cliente também não fechou pelo portal — precisa perguntar a
              quantidade de entregas e corrigir.
            </p>
          </div>
          <span className="shrink-0 text-xs font-semibold text-amber-800">Ver →</span>
        </Link>
      )}

      <div>
        <h2 className="text-sm font-semibold text-navy-900 mb-3">Clientes agora</h2>
        {resumoClientes.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhum cliente ativo.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {resumoClientes.map((c) => {
              const faltaEscalar = c.contratadas > 0 && c.escaladas < c.contratadas;
              // presentes só compara com o turno que está DE FATO rolando
              // agora — pra um turno que ainda vai começar, ninguém
              // deveria estar lá mesmo, então não é "falta gente".
              const faltaGente = c.turnoAtual !== null && c.contratadas > 0 && c.presentes < c.contratadas;
              const equipeIncompleta = faltaEscalar || faltaGente;
              const conteudo = (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-navy-900 truncate">{c.nome}</p>
                    <span className="shrink-0 text-xs text-stone-500 capitalize">
                      {c.turnoRelevante ? LABEL_TURNO[c.turnoRelevante] : "sem turno hoje"}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 mt-3 text-center">
                    <div>
                      <p className="text-lg font-bold text-navy-900">{c.contratadas}</p>
                      <p className="text-[10px] text-stone-500 leading-tight">contratadas</p>
                    </div>
                    <div>
                      <p className={`text-lg font-bold ${faltaEscalar ? "text-red-600" : "text-navy-900"}`}>
                        {c.escaladas}
                      </p>
                      <p className="text-[10px] text-stone-500 leading-tight">escaladas</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-navy-900">{c.confirmadas}</p>
                      <p className="text-[10px] text-stone-500 leading-tight">confirmaram</p>
                    </div>
                    <div>
                      <p className={`text-lg font-bold ${faltaGente ? "text-red-600" : "text-navy-900"}`}>
                        {c.presentes}
                      </p>
                      <p className="text-[10px] text-stone-500 leading-tight">presentes</p>
                    </div>
                  </div>
                </>
              );
              const classe = `rounded-2xl border p-4 ${
                equipeIncompleta ? "border-red-300 bg-red-50" : "border-stone-200 bg-white"
              }`;
              const href = `/escala?clienteId=${c.id}&data=${hojeISO}${c.turnoRelevante ? `&turno=${c.turnoRelevante}` : ""}`;
              // /escala (dia) é uma das exceções que Gestor de campo pode
              // acessar (ver comentário em requireTenantCompleto), então
              // esse card é clicável pros dois papéis — diferente do que
              // acontecia quando o destino era /clientes/[id].
              return (
                <Link
                  key={c.id}
                  href={href}
                  className={`${classe} hover:border-brand-300 hover:shadow-sm transition`}
                >
                  {conteudo}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

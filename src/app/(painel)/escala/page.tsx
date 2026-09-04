import Link from "next/link";
import { requireTenant, clientesResponsaveisIds } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { dataISOBrasil, formatarHora } from "@/lib/data";
import { LABEL_TURNO } from "@/lib/equipe";
import EscalaRow from "./EscalaRow";
import CandidatoRow from "./CandidatoRow";
import ManterEscalaAnteriorBanner from "./ManterEscalaAnteriorBanner";
import type { TurnoEscala } from "@/generated/prisma/enums";

/** Dia da semana (Date.getDay(): 0=domingo...6=sábado) de uma data
 * "YYYY-MM-DD" — pura leitura de calendário, sem conversão de fuso (não
 * é um instante, é só "que dia da semana cai essa data"). */
function diaSemanaDaData(data: string): number {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(ano, mes - 1, dia).getDay();
}

/** Sete dias antes, no formato "YYYY-MM-DD" — usado pra sugerir a escala
 * da mesma data da semana passada. */
function seteDiasAntes(data: string): string {
  const [ano, mes, dia] = data.split("-").map(Number);
  const anterior = new Date(ano, mes - 1, dia - 7);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${anterior.getFullYear()}-${pad(anterior.getMonth() + 1)}-${pad(anterior.getDate())}`;
}

export default async function EscalaPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string; data?: string; turno?: string }>;
}) {
  const sessao = await requireTenant();
  const params = await searchParams;

  // Gestor de campo só monta escala pros clientes que ele é responsável
  // (ver MotoboyCliente.gestor) — dono/equipe normal vê todos.
  const idsResponsaveis = await clientesResponsaveisIds(sessao);
  const escopoGestor = sessao.role === "GESTOR_CAMPO";

  const clientes = await prisma.cliente.findMany({
    where: {
      empresaId: sessao.empresaEfetivoId,
      ativo: true,
      ...(escopoGestor ? { id: { in: idsResponsaveis } } : {}),
    },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  const clienteIdPedido = Number(params.clienteId) || clientes[0]?.id;
  // Se pediu um cliente fora da lista permitida (URL manipulada), cai pro
  // primeiro cliente que ele realmente pode ver.
  const clienteId =
    clientes.find((c) => c.id === clienteIdPedido)?.id ?? clientes[0]?.id;
  const data = params.data || dataISOBrasil();

  if (escopoGestor && clientes.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-navy-900">Escala</h1>
        <p className="text-sm text-stone-500">
          Você ainda não é responsável por nenhum cliente. Fale com a cooperativa.
        </p>
      </div>
    );
  }

  if (!clienteId) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-navy-900">Escala</h1>
        <p className="text-sm text-stone-500">Cadastre um cliente antes de montar a escala.</p>
      </div>
    );
  }

  const clienteSelecionado = await prisma.cliente.findFirstOrThrow({
    where: { id: clienteId, empresaId: sessao.empresaEfetivoId },
    select: {
      nome: true,
      turnoManhaAtivo: true,
      turnoTardeAtivo: true,
      turnoNoiteAtivo: true,
      motosFixasManha: true,
      motosFixasTarde: true,
      motosFixasNoite: true,
    },
  });

  // Só oferece escolher o turno que o cliente de fato usa — se ele só tem
  // noite, nem mostra manhã como opção (pedido do Thiago).
  const turnosDisponiveis: TurnoEscala[] = [
    ...(clienteSelecionado.turnoManhaAtivo ? (["MANHA"] as const) : []),
    ...(clienteSelecionado.turnoTardeAtivo ? (["TARDE"] as const) : []),
    ...(clienteSelecionado.turnoNoiteAtivo ? (["NOITE"] as const) : []),
  ];

  if (turnosDisponiveis.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-navy-900">Escala</h1>
        <p className="text-sm text-stone-500">
          <strong>{clienteSelecionado.nome}</strong> ainda não tem nenhum turno configurado.{" "}
          {escopoGestor ? (
            "Fale com a cooperativa pra configurar o horário dele antes de montar a escala."
          ) : (
            <>
              <Link href={`/clientes/${clienteId}`} className="text-brand-700 underline">
                Configure o horário dele
              </Link>{" "}
              antes de montar a escala.
            </>
          )}
        </p>
      </div>
    );
  }

  const turno: TurnoEscala = turnosDisponiveis.includes(params.turno as TurnoEscala)
    ? (params.turno as TurnoEscala)
    : turnosDisponiveis[0];

  const diaSemana = diaSemanaDaData(data);
  const motosContratadas =
    turno === "MANHA"
      ? clienteSelecionado.motosFixasManha[diaSemana]
      : turno === "TARDE"
        ? clienteSelecionado.motosFixasTarde[diaSemana]
        : clienteSelecionado.motosFixasNoite[diaSemana];

  const dataSemanaPassada = seteDiasAntes(data);

  const [escalados, candidatosBrutos, escaladosSemanaPassada] = await Promise.all([
    prisma.escalaTurno.findMany({
      where: { clienteId, data: new Date(data), turno },
      include: {
        motoboy: { select: { id: true, nomeCompleto: true, tipoEquipamento: true } },
        turnoVinculado: { select: { horaInicio: true } },
      },
      orderBy: { criadoEm: "asc" },
    }),
    prisma.motoboy.findMany({
      where: {
        empresaId: sessao.empresaEfetivoId,
        ativo: true,
        OR: [{ livre: true }, { clientesLiberados: { some: { clienteId, liberado: true } } }],
      },
      orderBy: { nomeCompleto: "asc" },
      select: { id: true, nomeCompleto: true, tipoEquipamento: true },
    }),
    prisma.escalaTurno.findMany({
      where: { clienteId, data: new Date(dataSemanaPassada), turno },
      include: { motoboy: { select: { nomeCompleto: true } } },
    }),
  ]);

  const escaladosIds = new Set(escalados.map((e) => e.motoboyId));
  const candidatos = candidatosBrutos.filter((m) => !escaladosIds.has(m.id));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Escala</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Escale manualmente quem vai trabalhar em cada cliente — o cliente vê isso no portal dele
          e o card fica verde assim que o motoboy bater o início do turno.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Cliente</span>
          <select
            name="clienteId"
            defaultValue={clienteId}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
          >
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Data</span>
          <input
            type="date"
            name="data"
            defaultValue={data}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
          />
        </label>
        {turnosDisponiveis.length > 1 ? (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-stone-500">Turno</span>
            <select
              name="turno"
              defaultValue={turno}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
            >
              {turnosDisponiveis.map((t) => (
                <option key={t} value={t}>
                  {LABEL_TURNO[t].charAt(0).toUpperCase() + LABEL_TURNO[t].slice(1)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" name="turno" value={turno} />
        )}
        <button
          type="submit"
          className="rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          Ver
        </button>
        <Link href={`/escala/semana?clienteId=${clienteId}&inicio=${data}`} className="text-sm text-brand-700 hover:underline">
          Ver semana inteira →
        </Link>
      </form>

      {turnosDisponiveis.length === 1 && (
        <p className="text-xs text-stone-500 -mt-4">
          {clienteSelecionado.nome} só tem turno de {LABEL_TURNO[turno]}.
        </p>
      )}

      {motosContratadas > 0 && escalados.length !== motosContratadas && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Faltam motos: são {motosContratadas} contratadas pra esse dia e só {escalados.length}{" "}
          {escalados.length === 1 ? "está" : "estão"} escalada
          {escalados.length === 1 ? "" : "s"}. O cliente também vê esse número no portal dele.
        </div>
      )}

      {escalados.length === 0 && escaladosSemanaPassada.length > 0 && (
        <ManterEscalaAnteriorBanner
          clienteId={clienteId}
          turno={turno}
          data={data}
          nomes={escaladosSemanaPassada.map((e) => e.motoboy.nomeCompleto)}
        />
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-navy-900">
          Escalados ({escalados.length}
          {motosContratadas > 0 ? ` de ${motosContratadas}` : ""})
        </h2>
        {escalados.length === 0 ? (
          <p className="text-sm text-stone-500">Ninguém escalado ainda pra esse filtro.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {escalados.map((e) => (
              <EscalaRow
                key={e.id}
                escalaId={e.id}
                nome={e.motoboy.nomeCompleto}
                tipoEquipamento={e.motoboy.tipoEquipamento}
                chegou={e.turnoVinculado !== null}
                horaChegada={e.turnoVinculado ? formatarHora(e.turnoVinculado.horaInicio) : null}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-navy-900">
          Disponíveis pra escalar ({candidatos.length})
        </h2>
        {candidatos.length === 0 ? (
          <p className="text-sm text-stone-500">
            Nenhum motoboy liberado nesse cliente que já não esteja escalado.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {candidatos.map((m) => (
              <CandidatoRow
                key={m.id}
                clienteId={clienteId}
                motoboyId={m.id}
                nome={m.nomeCompleto}
                tipoEquipamento={m.tipoEquipamento}
                data={data}
                turno={turno}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { requireTenant, clientesResponsaveisIds } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { dataISOBrasil } from "@/lib/data";
import { LABEL_TURNO } from "@/lib/equipe";
import type { TurnoEscala } from "@/generated/prisma/enums";

const DIAS_NA_SEMANA = 7;
const LABEL_DIA_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** Mesma leitura pura de calendário usada em escala/page.tsx — não é um
 * instante, é só "que dia da semana cai essa data". */
function diaSemanaDaData(data: string): number {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(ano, mes - 1, dia).getDay();
}

function somarDias(data: string, n: number): string {
  const [ano, mes, dia] = data.split("-").map(Number);
  const resultado = new Date(ano, mes - 1, dia + n);
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${resultado.getFullYear()}-${pad(resultado.getMonth() + 1)}-${pad(resultado.getDate())}`;
}

function formatarDiaCurto(data: string): string {
  const [, mes, dia] = data.split("-");
  return `${dia}/${mes}`;
}

/** EscalaTurno.data é @db.Date (sem hora) — vem do banco como meia-noite
 * UTC do dia certo. Ler com getUTC* (não com o formatador de Brasília,
 * que é pra instantes de verdade) evita jogar pro dia anterior. */
function paraISO(data: Date): string {
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${data.getUTCFullYear()}-${pad(data.getUTCMonth() + 1)}-${pad(data.getUTCDate())}`;
}

export default async function EscalaSemanaPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string; inicio?: string }>;
}) {
  const sessao = await requireTenant();
  const params = await searchParams;

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
  const clienteId = clientes.find((c) => c.id === clienteIdPedido)?.id ?? clientes[0]?.id;
  const inicio = params.inicio || dataISOBrasil();

  if (!clienteId) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-navy-900">Escala da semana</h1>
        <p className="text-sm text-stone-500">
          {escopoGestor
            ? "Você ainda não é responsável por nenhum cliente. Fale com a cooperativa."
            : "Cadastre um cliente antes de montar a escala."}
        </p>
      </div>
    );
  }

  const cliente = await prisma.cliente.findFirstOrThrow({
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

  const turnosDisponiveis: TurnoEscala[] = [
    ...(cliente.turnoManhaAtivo ? (["MANHA"] as const) : []),
    ...(cliente.turnoTardeAtivo ? (["TARDE"] as const) : []),
    ...(cliente.turnoNoiteAtivo ? (["NOITE"] as const) : []),
  ];

  const dias = Array.from({ length: DIAS_NA_SEMANA }, (_, i) => somarDias(inicio, i));
  const fimExclusivo = somarDias(inicio, DIAS_NA_SEMANA);

  const escalasDaSemana =
    turnosDisponiveis.length === 0
      ? []
      : await prisma.escalaTurno.findMany({
          where: {
            clienteId,
            data: { gte: new Date(inicio), lt: new Date(fimExclusivo) },
          },
          include: { motoboy: { select: { nomeCompleto: true } } },
          orderBy: { criadoEm: "asc" },
        });

  function motosContratadas(turno: TurnoEscala, diaSemana: number): number {
    if (turno === "MANHA") return cliente.motosFixasManha[diaSemana];
    if (turno === "TARDE") return cliente.motosFixasTarde[diaSemana];
    return cliente.motosFixasNoite[diaSemana];
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Escala da semana</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Visão dos próximos {DIAS_NA_SEMANA} dias pra {cliente.nome}. Clique num dia/turno pra
          escalar ou tirar alguém.
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
          <span className="text-xs text-stone-500">A partir de</span>
          <input
            type="date"
            name="inicio"
            defaultValue={inicio}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          Ver
        </button>
        <Link
          href={`/escala?clienteId=${clienteId}&data=${inicio}`}
          className="text-sm text-brand-700 hover:underline"
        >
          Editar dia a dia →
        </Link>
      </form>

      {turnosDisponiveis.length === 0 ? (
        <p className="text-sm text-stone-500">
          <strong>{cliente.nome}</strong> ainda não tem nenhum turno configurado.{" "}
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
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full border-collapse text-sm min-w-[640px]">
            <thead>
              <tr>
                <th className="text-left text-xs text-stone-500 font-semibold pb-2 pr-3">Dia</th>
                {turnosDisponiveis.map((t) => (
                  <th key={t} className="text-left text-xs text-stone-500 font-semibold pb-2 pr-3">
                    {LABEL_TURNO[t].charAt(0).toUpperCase() + LABEL_TURNO[t].slice(1)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dias.map((dia) => {
                const diaSemana = diaSemanaDaData(dia);
                return (
                  <tr key={dia} className="border-t border-stone-200">
                    <td className="py-3 pr-3 align-top whitespace-nowrap font-medium text-navy-900">
                      {LABEL_DIA_SEMANA[diaSemana]} {formatarDiaCurto(dia)}
                    </td>
                    {turnosDisponiveis.map((turno) => {
                      const contratadas = motosContratadas(turno, diaSemana);
                      const escalados = escalasDaSemana.filter(
                        (e) => e.turno === turno && paraISO(e.data) === dia
                      );
                      const incompleta = contratadas > 0 && escalados.length < contratadas;
                      return (
                        <td key={turno} className="py-3 pr-3 align-top">
                          <Link
                            href={`/escala?clienteId=${clienteId}&data=${dia}&turno=${turno}`}
                            className="flex flex-col gap-1 hover:opacity-75"
                          >
                            <span
                              className={`text-xs font-semibold ${incompleta ? "text-amber-700" : "text-stone-500"}`}
                            >
                              {escalados.length}
                              {contratadas > 0 ? ` de ${contratadas}` : ""}
                            </span>
                            {escalados.length === 0 ? (
                              <span className="text-xs text-stone-400">ninguém</span>
                            ) : (
                              escalados.map((e) => (
                                <span key={e.id} className="text-xs text-stone-700">
                                  {e.motoboy.nomeCompleto}
                                </span>
                              ))
                            )}
                          </Link>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

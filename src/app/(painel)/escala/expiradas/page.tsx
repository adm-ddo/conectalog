import Link from "next/link";
import { requireTenant, clientesResponsaveisIds } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { formatarHora } from "@/lib/data";
import { LABEL_TURNO } from "@/lib/equipe";
import { expirarEscalasVencidas, prazoConfirmacao } from "@/lib/escala";
import BotaoVoltar from "@/components/BotaoVoltar";
import EquipamentoBadge from "@/components/EquipamentoBadge";

/** EscalaTurno.data é @db.Date — meia-noite UTC do dia certo, sem fuso;
 * getUTC* evita jogar pro dia anterior (mesmo motivo de outros lugares
 * que leem esse campo, ver escala/actions.ts). */
function paraISOCalendario(data: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${data.getUTCFullYear()}-${pad(data.getUTCMonth() + 1)}-${pad(data.getUTCDate())}`;
}

function formatarDataCalendario(data: Date): string {
  const [ano, mes, dia] = paraISOCalendario(data).split("-");
  return `${dia}/${mes}/${ano}`;
}

export default async function EscalasExpiradasPage() {
  const sessao = await requireTenant();

  await expirarEscalasVencidas(new Date(), { empresaId: sessao.empresaEfetivoId });

  const idsResponsaveis = await clientesResponsaveisIds(sessao);
  const escopoGestor = sessao.role === "GESTOR_CAMPO";

  const expiradas = await prisma.escalaTurno.findMany({
    where: {
      statusConfirmacao: "EXPIRADA",
      cliente: {
        empresaId: sessao.empresaEfetivoId,
        ...(escopoGestor ? { id: { in: idsResponsaveis } } : {}),
      },
    },
    include: {
      motoboy: { select: { id: true, nomeCompleto: true, tipoEquipamento: true } },
      cliente: {
        select: {
          id: true,
          nome: true,
          turnoManhaInicio: true,
          turnoTardeInicio: true,
          turnoNoiteInicio: true,
        },
      },
    },
    orderBy: [{ data: "desc" }, { id: "desc" }],
    take: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <BotaoVoltar />
        <h1 className="text-2xl font-semibold text-navy-900 mt-1">Não confirmaram a tempo</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Escalas que caíram sozinhas porque o motoboy não confirmou nem recusou até 1h antes do
          horário de início — fica registrado aqui como histórico, mesmo depois de escalar outro
          no lugar.
        </p>
      </div>

      {expiradas.length === 0 ? (
        <p className="text-sm text-stone-500">Nenhuma escala caiu por falta de confirmação ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {expiradas.map((e) => {
            const prazo = prazoConfirmacao(e.cliente, e.turno, e.data);
            return (
              <li
                key={e.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Link
                    href={`/motoboys/${e.motoboy.id}`}
                    className="text-sm font-medium text-navy-900 hover:underline truncate"
                  >
                    {e.motoboy.nomeCompleto}
                  </Link>
                  <EquipamentoBadge tipo={e.motoboy.tipoEquipamento} />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 shrink-0">
                  <span className="text-xs text-stone-600">
                    {e.cliente.nome} · {LABEL_TURNO[e.turno]} · {formatarDataCalendario(e.data)}
                    {prazo && ` · prazo era ${formatarHora(prazo)}`}
                  </span>
                  <Link
                    href={`/escala?clienteId=${e.cliente.id}&data=${paraISOCalendario(e.data)}&turno=${e.turno}`}
                    className="text-xs font-semibold text-brand-700 hover:underline"
                  >
                    Escalar outro →
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

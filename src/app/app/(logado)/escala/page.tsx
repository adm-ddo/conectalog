import { requireMotoboy } from "@/lib/auth-motoboy";
import { prisma } from "@/lib/prisma";
import { dataISOBrasil } from "@/lib/data";
import { LABEL_TURNO } from "@/lib/equipe";
import ResponderEscalaButtons from "./ResponderEscalaButtons";
import AutoRefresh from "@/components/AutoRefresh";
import type { TurnoEscala, StatusConfirmacaoEscala } from "@/generated/prisma/enums";

const DIAS = 7;
const LABEL_DIA_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function somarDias(data: string, n: number): string {
  const [ano, mes, dia] = data.split("-").map(Number);
  const resultado = new Date(ano, mes - 1, dia + n);
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${resultado.getFullYear()}-${pad(resultado.getMonth() + 1)}-${pad(resultado.getDate())}`;
}

function diaSemanaDaData(data: string): number {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(ano, mes - 1, dia).getDay();
}

function formatarDiaCurto(data: string): string {
  const [, mes, dia] = data.split("-");
  return `${dia}/${mes}`;
}

/** EscalaTurno.data é @db.Date — vem do banco como meia-noite UTC do dia
 * certo. Ler com getUTC* (não com o formatador de Brasília, que é pra
 * instantes de verdade) evita jogar pro dia anterior. */
function paraISO(data: Date): string {
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${data.getUTCFullYear()}-${pad(data.getUTCMonth() + 1)}-${pad(data.getUTCDate())}`;
}

export default async function EscalaMotoboyPage() {
  const sessao = await requireMotoboy();

  const hoje = dataISOBrasil();
  const fimExclusivo = somarDias(hoje, DIAS);

  const escalas = await prisma.escalaTurno.findMany({
    where: {
      motoboyId: sessao.motoboyId,
      data: { gte: new Date(hoje), lt: new Date(fimExclusivo) },
    },
    include: { cliente: { select: { nome: true } } },
    orderBy: { data: "asc" },
  });

  const porDia = new Map<
    string,
    { id: number; turno: TurnoEscala; clienteNome: string; statusConfirmacao: StatusConfirmacaoEscala }[]
  >();
  for (const e of escalas) {
    const dia = paraISO(e.data);
    const lista = porDia.get(dia) ?? [];
    lista.push({
      id: e.id,
      turno: e.turno,
      clienteNome: e.cliente.nome,
      statusConfirmacao: e.statusConfirmacao,
    });
    porDia.set(dia, lista);
  }

  const diasComEscala = Array.from({ length: DIAS }, (_, i) => somarDias(hoje, i)).filter((dia) =>
    porDia.has(dia)
  );

  return (
    <div className="flex flex-col gap-5">
      <AutoRefresh />
      <div>
        <h1 className="text-lg font-semibold text-navy-900">Minha escala</h1>
        <p className="text-sm text-stone-500 mt-1">
          Onde a cooperativa já te escalou nos próximos {DIAS} dias.
        </p>
      </div>

      {diasComEscala.length === 0 ? (
        <p className="text-sm text-stone-500">Você ainda não foi escalado pra nenhum dia.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {diasComEscala.map((dia) => (
            <li key={dia} className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                {LABEL_DIA_SEMANA[diaSemanaDaData(dia)]} · {formatarDiaCurto(dia)}
              </p>
              <ul className="flex flex-col gap-2">
                {porDia.get(dia)!.map((item) => (
                  <li key={item.id} className="flex flex-col gap-1.5 border-b border-stone-100 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm text-navy-900">{item.clienteNome}</span>
                      <span className="shrink-0 text-xs text-stone-500 capitalize">
                        {LABEL_TURNO[item.turno]}
                      </span>
                    </div>
                    <ResponderEscalaButtons escalaId={item.id} statusAtual={item.statusConfirmacao} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

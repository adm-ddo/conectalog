import Link from "next/link";
import { notFound } from "next/navigation";
import { resolverClientePortal } from "@/lib/portal";
import { prisma } from "@/lib/prisma";
import { dataISOBrasil, instanteBrasil, formatarHora } from "@/lib/data";
import { LABEL_TURNO } from "@/lib/equipe";
import { PRAZO_CONFIRMACAO_MIN } from "@/lib/confirmacaoBandas";
import EquipamentoBadge from "@/components/EquipamentoBadge";
import SeletorData from "./SeletorData";

/** Formata "YYYY-MM-DD" (calendário puro, sem instante/fuso) como
 * "sexta-feira, 05 de setembro" — mesmo texto usado no cabeçalho da tela
 * de hoje (/portal/[token]), pra manter a mesma linguagem visual. */
function formatarDiaExtenso(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

/** Transparência pedida pelo Thiago: o cliente pode conferir qualquer
 * dia passado (não só hoje, que já tem tela própria em /portal/[token])
 * e ver, turno a turno, o que o motoboy disse que fez versus o que ele
 * mesmo confirmou pelo portal — pra checar que ficou tudo certo mesmo
 * sem precisar confiar de olhos fechados. */
export default async function HistoricoPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ data?: string }>;
}) {
  const { token } = await params;
  const cliente = await resolverClientePortal(token);
  if (!cliente) notFound();

  const hojeISO = dataISOBrasil();
  const { data: dataParam } = await searchParams;
  const data = dataParam || hojeISO;

  const turnos = await prisma.turno.findMany({
    where: {
      clienteId: cliente.id,
      horaInicio: { gte: instanteBrasil(data), lt: instanteBrasil(data, 24 * 60) },
    },
    include: {
      motoboy: { select: { nomeCompleto: true, tipoEquipamento: true } },
      avaliacao: { select: { nota: true } },
    },
    orderBy: [{ turnoPredefinido: "asc" }, { horaInicio: "asc" }],
  });

  const agora = new Date();

  return (
    <div className="flex flex-col gap-4 w-full max-w-md mx-auto">
      <div>
        {/* Link fixo pro início do portal, não router.back(): as setas de
         * dia anterior/seguinte trocam a URL, então "voltar do navegador"
         * fica preso ciclando entre datas em vez de sair da tela — um
         * botão de história (router.back()) teria o mesmo problema. */}
        <Link href={`/portal/${token}`} className="text-xs text-stone-500 hover:underline">
          ← Voltar
        </Link>
        <h1 className="text-lg font-semibold text-navy-900 mt-1">
          Histórico{" "}
          <span className="font-normal text-stone-500">· {formatarDiaExtenso(data)}</span>
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          O que o motoboy disse que entregou e o que você confirmou.
        </p>
      </div>

      <SeletorData token={token} data={data} hojeISO={hojeISO} />

      {turnos.length === 0 ? (
        <p className="text-sm text-stone-500">Nenhum motoboy trabalhou aqui nesse dia.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {turnos.map((t) => {
            const bandasIguais = t.quantidadeBandasCliente !== null && t.quantidadeBandasCliente === t.quantidadeBandas;
            const prazoAberto =
              t.horaFim !== null && agora <= new Date(t.horaFim.getTime() + PRAZO_CONFIRMACAO_MIN * 60_000);
            return (
              <li key={t.id} className="rounded-xl border border-stone-200 bg-white px-4 py-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-navy-900 flex items-center gap-1.5 min-w-0 truncate">
                    {t.motoboy.nomeCompleto}
                    <EquipamentoBadge tipo={t.motoboy.tipoEquipamento} />
                  </span>
                  <span className="text-xs text-stone-500 shrink-0 capitalize">
                    {LABEL_TURNO[t.turnoPredefinido as keyof typeof LABEL_TURNO] ?? "livre"} ·{" "}
                    {formatarHora(t.horaInicio)}
                    {t.horaFim && `–${formatarHora(t.horaFim)}`}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-stone-500">
                    Motoboy disse: <strong className="text-navy-900">{t.quantidadeBandas}</strong>
                  </span>
                  <span className={bandasIguais || t.quantidadeBandasCliente === null ? "text-stone-500" : "text-red-600 font-semibold"}>
                    {t.quantidadeBandasCliente === null ? (
                      prazoAberto ? (
                        <Link href={`/portal/${token}/encerrar/${t.id}`} className="text-brand-700 font-semibold hover:underline">
                          Confirmar agora →
                        </Link>
                      ) : (
                        "Você não confirmou"
                      )
                    ) : (
                      <>Você confirmou: <strong>{t.quantidadeBandasCliente}</strong></>
                    )}
                  </span>
                </div>
                {t.avaliacao && (
                  <p className="text-xs text-stone-500">{"★".repeat(t.avaliacao.nota)} avaliado</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

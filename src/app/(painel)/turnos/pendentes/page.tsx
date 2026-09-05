import Link from "next/link";
import { requireTenantCompleto } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { formatarDataHora } from "@/lib/data";
import { LABEL_TURNO } from "@/lib/equipe";
import EquipamentoBadge from "@/components/EquipamentoBadge";
import BotaoVoltar from "@/components/BotaoVoltar";

/** Turnos que o motoboy esqueceu de encerrar E o cliente também nunca
 * fechou pelo portal — o cron (fecharTurnosEsquecidos) fechou sozinho só
 * pra tirar do ABERTO, mas ninguém confirmou quantas entregas rolaram de
 * verdade. Fica aqui até a cooperativa perguntar pro motoboy e corrigir
 * (link pra tela do turno, que já tem o formulário de correção). */
export default async function TurnosPendentesPage() {
  const sessao = await requireTenantCompleto();

  const turnos = await prisma.turno.findMany({
    where: {
      motoboy: { empresaId: sessao.empresaEfetivoId },
      fechamentoAutomatico: true,
      resolvidoDivergenciaEm: null,
    },
    orderBy: { horaInicio: "asc" },
    include: {
      motoboy: { select: { nomeCompleto: true, tipoEquipamento: true } },
      cliente: { select: { nome: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <BotaoVoltar />
        <h1 className="text-2xl font-semibold text-navy-900 mt-1">
          Turnos pendentes de confirmação ({turnos.length})
        </h1>
        <p className="text-stone-600 mt-1 text-sm">
          O motoboy não encerrou e o cliente também não fechou pelo portal — o sistema fechou
          sozinho pra limpar o app, mas ainda precisa da quantidade real de entregas.
        </p>
      </div>

      {turnos.length === 0 ? (
        <p className="text-sm text-stone-500">Nenhum turno pendente — tudo confirmado.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {turnos.map((t) => (
            <li key={t.id}>
              <Link
                href={`/turnos/${t.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 hover:border-amber-400 transition-colors"
              >
                <div className="min-w-0 flex flex-col gap-1">
                  <span className="text-sm font-semibold text-navy-900 flex items-center gap-2">
                    {t.motoboy.nomeCompleto}
                    <EquipamentoBadge tipo={t.motoboy.tipoEquipamento} />
                  </span>
                  <span className="text-xs text-stone-600">
                    {t.cliente.nome} · {LABEL_TURNO[t.turnoPredefinido as keyof typeof LABEL_TURNO] ?? "livre"} ·{" "}
                    {formatarDataHora(t.horaInicio)}
                  </span>
                </div>
                <span className="shrink-0 text-xs font-semibold text-amber-800">
                  Corrigir →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

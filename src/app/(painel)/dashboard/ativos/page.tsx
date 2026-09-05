import Link from "next/link";
import { requireTenant, clientesResponsaveisIds } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { formatarHora } from "@/lib/data";
import EquipamentoBadge from "@/components/EquipamentoBadge";
import BotaoVoltar from "@/components/BotaoVoltar";
import type { Prisma } from "@/generated/prisma/client";

export default async function AtivosAgoraPage() {
  const sessao = await requireTenant();

  const idsResponsaveis = await clientesResponsaveisIds(sessao);
  const escopoGestor = sessao.role === "GESTOR_CAMPO";
  const filtroCliente: Prisma.ClienteWhereInput = escopoGestor
    ? { id: { in: idsResponsaveis } }
    : {};

  const turnosAbertos = await prisma.turno.findMany({
    where: {
      status: "ABERTO",
      motoboy: { empresaId: sessao.empresaEfetivoId },
      cliente: filtroCliente,
    },
    orderBy: { horaInicio: "asc" },
    include: {
      motoboy: { select: { id: true, nomeCompleto: true, tipoEquipamento: true } },
      cliente: { select: { id: true, nome: true } },
    },
  });

  const porCliente = new Map<number, { nome: string; itens: typeof turnosAbertos }>();
  for (const t of turnosAbertos) {
    const atual = porCliente.get(t.cliente.id) ?? { nome: t.cliente.nome, itens: [] };
    atual.itens.push(t);
    porCliente.set(t.cliente.id, atual);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <BotaoVoltar />
        <h1 className="text-2xl font-semibold text-navy-900 mt-1">
          Trabalhando agora ({turnosAbertos.length})
        </h1>
        <p className="text-stone-600 mt-1 text-sm">Turnos abertos neste momento, por cliente.</p>
      </div>

      {porCliente.size === 0 ? (
        <p className="text-sm text-stone-500">Nenhum motoboy com turno aberto no momento.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {[...porCliente.values()].map((grupo) => (
            <div key={grupo.nome} className="rounded-2xl border border-stone-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-navy-900 mb-3">
                {grupo.nome} · {grupo.itens.length}
              </h2>
              <ul className="flex flex-col gap-2">
                {grupo.itens.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 min-w-0">
                      {escopoGestor ? (
                        <span className="text-navy-900 truncate">{t.motoboy.nomeCompleto}</span>
                      ) : (
                        <Link
                          href={`/motoboys/${t.motoboy.id}`}
                          className="text-navy-900 hover:underline truncate"
                        >
                          {t.motoboy.nomeCompleto}
                        </Link>
                      )}
                      <EquipamentoBadge tipo={t.motoboy.tipoEquipamento} />
                    </span>
                    <span className="shrink-0 text-xs text-stone-500">
                      desde {formatarHora(t.horaInicio)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

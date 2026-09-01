import Link from "next/link";
import { requireEmpresa } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import DashboardAutoRefresh from "../DashboardAutoRefresh";

export default async function DashboardPage() {
  const sessao = await requireEmpresa();

  const [turnosAbertos, totalMotoboysAtivos, totalClientesAtivos] = await Promise.all([
    prisma.turno.findMany({
      where: { status: "ABERTO", motoboy: { empresaId: sessao.empresaId } },
      orderBy: { horaInicio: "asc" },
      select: {
        id: true,
        horaInicio: true,
        motoboy: { select: { nomeCompleto: true } },
        cliente: { select: { id: true, nome: true } },
      },
    }),
    prisma.motoboy.count({ where: { empresaId: sessao.empresaId, ativo: true } }),
    prisma.cliente.count({ where: { empresaId: sessao.empresaId, ativo: true } }),
  ]);

  const porCliente = new Map<
    number,
    { nome: string; motoboys: { id: number; nome: string; horaInicio: Date }[] }
  >();
  for (const t of turnosAbertos) {
    const atual = porCliente.get(t.cliente.id) ?? { nome: t.cliente.nome, motoboys: [] };
    atual.motoboys.push({ id: t.id, nome: t.motoboy.nomeCompleto, horaInicio: t.horaInicio });
    porCliente.set(t.cliente.id, atual);
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardAutoRefresh />
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Dashboard</h1>
        <p className="text-stone-600 mt-1 text-sm">Visão geral da operação agora.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">
            Turnos abertos agora
          </p>
          <p className="text-3xl font-bold text-navy-900 mt-1">{turnosAbertos.length}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">
            Motoboys ativos
          </p>
          <p className="text-3xl font-bold text-navy-900 mt-1">{totalMotoboysAtivos}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">
            Clientes ativos
          </p>
          <p className="text-3xl font-bold text-navy-900 mt-1">{totalClientesAtivos}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-navy-900 mb-3">Quem está em turno agora</h2>
        {porCliente.size === 0 ? (
          <p className="text-sm text-stone-500">Nenhum motoboy com turno aberto no momento.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {[...porCliente.entries()].map(([clienteId, grupo]) => (
              <div key={clienteId} className="flex flex-col gap-2">
                <Link
                  href={`/clientes/${clienteId}`}
                  className="text-sm font-semibold text-navy-900 hover:underline"
                >
                  {grupo.nome} · {grupo.motoboys.length}{" "}
                  {grupo.motoboys.length === 1 ? "motoboy" : "motoboys"}
                </Link>
                <ul className="flex flex-col gap-1 pl-3 border-l-2 border-brand-200">
                  {grupo.motoboys.map((m) => (
                    <li key={m.id} className="text-sm text-stone-600">
                      {m.nome} — desde{" "}
                      {m.horaInicio.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth-empresa";
import { sair } from "@/app/(painel)/actions";
import { prisma } from "@/lib/prisma";
import { formatarData } from "@/lib/data";
import EmpresaRow from "./EmpresaRow";

export default async function MasterPage() {
  const sessao = await requireSuperAdmin();

  const [empresas, totalMotoboysGeral] = await Promise.all([
    prisma.empresa.findMany({
      orderBy: { criadoEm: "desc" },
      include: { _count: { select: { motoboys: true, clientes: true } } },
    }),
    prisma.motoboy.count(),
  ]);

  return (
    <div className="flex-1 flex flex-col bg-stone-50">
      <header className="bg-navy-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <span className="font-black text-lg tracking-tight">
            Conecta<span className="text-brand-400">Log</span>{" "}
            <span className="text-navy-300 font-normal text-sm">· master</span>
          </span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-navy-200">{sessao.nome}</span>
            <form action={sair}>
              <button type="submit" className="text-sm text-navy-200 hover:text-white underline">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">Cooperativas</h1>
          <p className="text-stone-600 mt-1 text-sm">
            Todos os clientes do ConectaLog. Entre em qualquer uma pra ver e mexer como se fosse o
            dono dela.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">
              Cooperativas cadastradas
            </p>
            <p className="text-3xl font-bold text-navy-900 mt-1">{empresas.length}</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">
              Motoboys no total
            </p>
            <p className="text-3xl font-bold text-navy-900 mt-1">{totalMotoboysGeral}</p>
            <Link href="/master/motoboys" className="text-xs text-brand-700 underline">
              Ver todos
            </Link>
          </div>
        </div>

        <ul className="flex flex-col gap-2">
          {empresas.map((e) => (
            <EmpresaRow
              key={e.id}
              empresaId={e.id}
              nome={e.nome}
              criadoEm={formatarData(e.criadoEm)}
              totalMotoboys={e._count.motoboys}
              totalClientes={e._count.clientes}
            />
          ))}
        </ul>
      </main>
    </div>
  );
}

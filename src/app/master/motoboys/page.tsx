import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth-empresa";
import { sair } from "@/app/(painel)/actions";
import { prisma } from "@/lib/prisma";
import EquipamentoBadge from "@/components/EquipamentoBadge";

export default async function MasterMotoboysPage() {
  const sessao = await requireSuperAdmin();

  const motoboys = await prisma.motoboy.findMany({
    orderBy: [{ empresa: { nome: "asc" } }, { nomeCompleto: "asc" }],
    select: {
      id: true,
      nomeCompleto: true,
      email: true,
      ativo: true,
      tipoEquipamento: true,
      empresa: { select: { nome: true } },
    },
  });

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
          <Link href="/master" className="text-sm text-brand-700 underline">
            ← Cooperativas
          </Link>
          <h1 className="text-2xl font-semibold text-navy-900 mt-1">
            Motoboys ({motoboys.length})
          </h1>
          <p className="text-stone-600 mt-1 text-sm">Todo motoboy cadastrado, em qualquer cooperativa.</p>
        </div>

        <ul className="flex flex-col gap-2">
          {motoboys.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3"
            >
              <div className="min-w-0 flex flex-col">
                <span className="text-sm font-semibold text-navy-900 truncate flex items-center gap-2">
                  {m.nomeCompleto}
                  <EquipamentoBadge tipo={m.tipoEquipamento} />
                </span>
                <span className="text-xs text-stone-500 truncate">
                  {m.email} · {m.empresa.nome}
                </span>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                  m.ativo ? "bg-brand-100 text-brand-800" : "bg-stone-100 text-stone-600"
                }`}
              >
                {m.ativo ? "Ativo" : "Inativo"}
              </span>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

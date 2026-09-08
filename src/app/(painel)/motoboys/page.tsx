import Link from "next/link";
import { requireTenantCompleto } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { formatarData } from "@/lib/data";
import MotoboyRow from "./MotoboyRow";
import SolicitacaoRow from "./SolicitacaoRow";
import NovoMotoboyForm from "./NovoMotoboyForm";

export default async function MotoboysPage({
  searchParams,
}: {
  searchParams: Promise<{ nome?: string }>;
}) {
  const sessao = await requireTenantCompleto();
  const { nome } = await searchParams;
  const busca = nome?.trim();
  const filtroNome = busca ? { nomeCompleto: { contains: busca, mode: "insensitive" as const } } : {};

  const [motoboys, solicitacoes] = await Promise.all([
    prisma.motoboy.findMany({
      where: { empresaId: sessao.empresaEfetivoId, aprovadoEm: { not: null }, ...filtroNome },
      orderBy: { nomeCompleto: "asc" },
      select: {
        id: true,
        nomeCompleto: true,
        email: true,
        ativo: true,
        livre: true,
        ehGestor: true,
        senhaHash: true,
        tipoEquipamento: true,
      },
    }),
    prisma.motoboy.findMany({
      where: { empresaId: sessao.empresaEfetivoId, aprovadoEm: null, ...filtroNome },
      orderBy: { criadoEm: "asc" },
      select: {
        id: true,
        nomeCompleto: true,
        email: true,
        telefoneCelular: true,
        tipoEquipamento: true,
        criadoEm: true,
      },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Motoboys</h1>
        <p className="text-stone-600 mt-1 text-sm">
          O ideal é que cada motoboy se cadastre pelo app dele (com foto e CNH). Aqui você também
          pode cadastrar manualmente e liberar em quais clientes cada um pode trabalhar.
        </p>
        <Link href="/motoboys/disponiveis" className="text-sm text-brand-700 hover:underline mt-1 inline-block">
          Ver motoboys disponíveis pra chamar →
        </Link>
      </div>

      <form method="get" className="flex items-center gap-2">
        <input
          type="search"
          name="nome"
          defaultValue={nome ?? ""}
          placeholder="Buscar por nome..."
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          Buscar
        </button>
        {busca && (
          <Link href="/motoboys" className="text-sm text-stone-500 hover:underline">
            Limpar
          </Link>
        )}
      </form>

      {solicitacoes.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-navy-900">
            Pedindo pra entrar ({solicitacoes.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {solicitacoes.map((m) => (
              <SolicitacaoRow
                key={m.id}
                motoboy={{
                  id: m.id,
                  nomeCompleto: m.nomeCompleto,
                  email: m.email,
                  telefoneCelular: m.telefoneCelular,
                  tipoEquipamento: m.tipoEquipamento,
                  data: formatarData(m.criadoEm),
                }}
              />
            ))}
          </ul>
        </div>
      )}

      {motoboys.length === 0 ? (
        <p className="text-stone-500 text-sm">
          {busca ? `Nenhum motoboy encontrado pra "${busca}".` : "Nenhum motoboy cadastrado ainda."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {motoboys.map((m) => (
            <MotoboyRow
              key={m.id}
              motoboy={{
                id: m.id,
                nomeCompleto: m.nomeCompleto,
                email: m.email,
                ativo: m.ativo,
                livre: m.livre,
                ehGestor: m.ehGestor,
                temAcesso: m.senhaHash !== null,
                tipoEquipamento: m.tipoEquipamento,
              }}
            />
          ))}
        </ul>
      )}

      <NovoMotoboyForm />
    </div>
  );
}

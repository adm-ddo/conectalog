import Link from "next/link";
import { requireTenantCompleto } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { formatarData } from "@/lib/data";
import MotoboyRow from "./MotoboyRow";
import SolicitacaoRow from "./SolicitacaoRow";
import NovoMotoboyForm from "./NovoMotoboyForm";

export default async function MotoboysPage() {
  const sessao = await requireTenantCompleto();

  const [motoboys, solicitacoes] = await Promise.all([
    prisma.motoboy.findMany({
      where: { empresaId: sessao.empresaEfetivoId, aprovadoEm: { not: null } },
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
      where: { empresaId: sessao.empresaEfetivoId, aprovadoEm: null },
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
        <p className="text-stone-500 text-sm">Nenhum motoboy cadastrado ainda.</p>
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

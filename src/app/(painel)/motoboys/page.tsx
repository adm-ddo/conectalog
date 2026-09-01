import { requireTenant } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import MotoboyRow from "./MotoboyRow";
import NovoMotoboyForm from "./NovoMotoboyForm";

export default async function MotoboysPage() {
  const sessao = await requireTenant();

  const motoboys = await prisma.motoboy.findMany({
    where: { empresaId: sessao.empresaEfetivoId },
    orderBy: { nomeCompleto: "asc" },
    select: {
      id: true,
      nomeCompleto: true,
      email: true,
      ativo: true,
      livre: true,
      senhaHash: true,
      tipoEquipamento: true,
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Motoboys</h1>
        <p className="text-stone-600 mt-1 text-sm">
          O ideal é que cada motoboy se cadastre pelo app dele (com foto e CNH). Aqui você também
          pode cadastrar manualmente e liberar em quais clientes cada um pode trabalhar.
        </p>
      </div>

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

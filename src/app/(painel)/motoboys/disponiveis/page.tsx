import Link from "next/link";
import { requireTenant } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import EquipamentoBadge from "@/components/EquipamentoBadge";

/** "Prateleira" — motoboys cadastrados no ConectaLog que não estão
 * vinculados a nenhuma cooperativa ainda (Motoboy.empresaId null).
 * Visível pra QUALQUER cooperativa (não é filtrado por empresa de
 * propósito — é um mercado compartilhado, todo mundo vê o mesmo pool de
 * gente disponível). Contato hoje é só por WhatsApp; chat interno fica
 * pra uma fase futura. */
export default async function MotoboysDisponiveisPage() {
  await requireTenant();

  const disponiveis = await prisma.motoboy.findMany({
    where: { empresaId: null, ativo: true },
    orderBy: { criadoEm: "desc" },
    select: {
      id: true,
      nomeCompleto: true,
      telefoneCelular: true,
      tipoEquipamento: true,
      cidade: true,
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/motoboys" className="text-sm text-brand-700 hover:underline">
          ← Voltar pros meus motoboys
        </Link>
        <h1 className="text-2xl font-semibold text-navy-900 mt-2">Motoboys disponíveis</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Cadastrados no ConectaLog, ainda sem cooperativa — chame no WhatsApp pra conversar. Se
          ele topar, é só mandar seu link de cadastro ou ele mesmo pede vaga na sua cooperativa
          pelo app dele.
        </p>
      </div>

      {disponiveis.length === 0 ? (
        <p className="text-stone-500 text-sm">Nenhum motoboy disponível no momento.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {disponiveis.map((m) => {
            const digitos = m.telefoneCelular.replace(/\D/g, "");
            const whatsapp = `https://wa.me/${digitos.startsWith("55") ? digitos : `55${digitos}`}`;
            return (
              <li
                key={m.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3"
              >
                <div className="min-w-0 flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-navy-900 flex items-center gap-2">
                    {m.nomeCompleto}
                    <EquipamentoBadge tipo={m.tipoEquipamento} />
                  </span>
                  <span className="text-xs text-stone-500">{m.cidade || "Cidade não informada"}</span>
                </div>
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-1.5 transition-colors self-start sm:self-auto"
                >
                  Chamar no WhatsApp
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

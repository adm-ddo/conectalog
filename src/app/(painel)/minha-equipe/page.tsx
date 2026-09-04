import { redirect } from "next/navigation";
import { requireTenant, clientesResponsaveisIds } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import EquipamentoBadge from "@/components/EquipamentoBadge";
import ToggleLiberacaoEquipe from "./ToggleLiberacaoEquipe";

/** Só existe pro Gestor de campo — dono/equipe normal já vê tudo isso em
 * /motoboys e /clientes. Mostra, por cliente que ele é responsável,
 * quantos e quais motoboys estão na equipe — bom pra cooperativa ver o
 * quanto ele está sobrecarregado (quantos clientes, quantas motos). */
export default async function MinhaEquipePage() {
  const sessao = await requireTenant();
  if (sessao.role !== "GESTOR_CAMPO") redirect("/motoboys");

  const idsResponsaveis = await clientesResponsaveisIds(sessao);

  const [clientes, motoboysDaCooperativa] = await Promise.all([
    prisma.cliente.findMany({
      where: { id: { in: idsResponsaveis } },
      orderBy: { nome: "asc" },
      include: {
        motoboysLiberados: { select: { motoboyId: true, liberado: true } },
      },
    }),
    prisma.motoboy.findMany({
      where: { empresaId: sessao.empresaEfetivoId, ativo: true, aprovadoEm: { not: null } },
      orderBy: { nomeCompleto: "asc" },
      select: { id: true, nomeCompleto: true, tipoEquipamento: true },
    }),
  ]);

  const totalNaEquipe = new Set(
    clientes.flatMap((c) => c.motoboysLiberados.filter((mc) => mc.liberado).map((mc) => mc.motoboyId))
  ).size;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Minha equipe</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Você é responsável por {clientes.length}{" "}
          {clientes.length === 1 ? "cliente" : "clientes"} e tem {totalNaEquipe}{" "}
          {totalNaEquipe === 1 ? "motoboy" : "motoboys"} na equipe, ao todo.
        </p>
      </div>

      {clientes.length === 0 ? (
        <p className="text-sm text-stone-500">
          Você ainda não é responsável por nenhum cliente. Fale com a cooperativa.
        </p>
      ) : (
        clientes.map((cliente) => {
          const liberadosIds = new Set(
            cliente.motoboysLiberados.filter((mc) => mc.liberado).map((mc) => mc.motoboyId)
          );
          return (
            <div
              key={cliente.id}
              className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-3"
            >
              <h2 className="text-sm font-semibold text-navy-900">
                {cliente.nome} ({liberadosIds.size} na equipe)
              </h2>
              {motoboysDaCooperativa.length === 0 ? (
                <p className="text-sm text-stone-500">Nenhum motoboy cadastrado na cooperativa.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {motoboysDaCooperativa.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-stone-700 flex items-center gap-2 min-w-0 truncate">
                        {m.nomeCompleto}
                        <EquipamentoBadge tipo={m.tipoEquipamento} />
                      </span>
                      <ToggleLiberacaoEquipe
                        clienteId={cliente.id}
                        motoboyId={m.id}
                        liberado={liberadosIds.has(m.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

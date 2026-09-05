import { requireMaster } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { formatarData } from "@/lib/data";
import MembroRow from "./MembroRow";
import ConviteRow from "./ConviteRow";
import ConvidarForm from "./ConvidarForm";

export default async function EquipePage() {
  const sessao = await requireMaster();

  const [membros, convites] = await Promise.all([
    prisma.usuario.findMany({
      // Gestores de campo (role GESTOR_CAMPO) não aparecem aqui — o login
      // deles é provisionado automaticamente e fica atrelado ao checkbox
      // "É Gestor" na tela do motoboy, pra não ter duas telas controlando
      // a mesma ativação.
      where: { empresaId: sessao.empresaEfetivoId, role: { not: "GESTOR_CAMPO" } },
      orderBy: [{ role: "asc" }, { nome: "asc" }],
    }),
    prisma.conviteEquipe.findMany({
      where: { empresaId: sessao.empresaEfetivoId, aceitoEm: null, expiraEm: { gt: new Date() } },
      orderBy: { criadoEm: "desc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Equipe</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Quem tem acesso ao painel da cooperativa. Só o dono (MASTER) pode convidar ou desativar
          alguém.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {membros.map((m) => (
          <MembroRow
            key={m.id}
            usuarioId={m.id}
            nome={m.nome}
            email={m.email}
            role={m.role === "MASTER" ? "MASTER" : "GESTOR"}
            ativo={m.ativo}
            podeAcessarFinanceiro={m.podeAcessarFinanceiro}
            souEu={m.id === sessao.usuarioId}
          />
        ))}
      </ul>

      {convites.length > 0 && (
        <ul className="flex flex-col gap-2">
          {convites.map((c) => (
            <ConviteRow
              key={c.id}
              conviteId={c.id}
              email={c.email}
              expiraEm={formatarData(c.expiraEm)}
            />
          ))}
        </ul>
      )}

      <ConvidarForm />
    </div>
  );
}

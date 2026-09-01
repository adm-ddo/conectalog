import { redirect } from "next/navigation";
import { requireMotoboy } from "@/lib/auth-motoboy";
import { prisma } from "@/lib/prisma";
import ApoioForm from "./ApoioForm";

export default async function ApoioPage() {
  const sessao = await requireMotoboy();

  const [motoboy, turnoAberto] = await Promise.all([
    prisma.motoboy.findUniqueOrThrow({ where: { id: sessao.motoboyId }, select: { livre: true } }),
    prisma.turno.findFirst({ where: { motoboyId: sessao.motoboyId, status: "ABERTO" } }),
  ]);
  if (!turnoAberto) redirect("/app/inicio");

  const selecaoCliente = {
    id: true,
    nome: true,
    taxasExtras: { orderBy: { ordem: "asc" as const }, select: { id: true, descricao: true } },
  };

  const clientes = motoboy.livre
    ? await prisma.cliente.findMany({
        where: { empresaId: sessao.empresaId, ativo: true, id: { not: turnoAberto.clienteId } },
        orderBy: { nome: "asc" },
        select: selecaoCliente,
      })
    : await prisma.cliente.findMany({
        where: {
          empresaId: sessao.empresaId,
          ativo: true,
          id: { not: turnoAberto.clienteId },
          motoboysLiberados: { some: { motoboyId: sessao.motoboyId, liberado: true } },
        },
        orderBy: { nome: "asc" },
        select: selecaoCliente,
      });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-navy-900">Registrar apoio</h1>
      <ApoioForm clientes={clientes} />
    </div>
  );
}

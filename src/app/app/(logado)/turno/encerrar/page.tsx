import { redirect } from "next/navigation";
import { requireMotoboy } from "@/lib/auth-motoboy";
import { prisma } from "@/lib/prisma";
import EncerrarTurnoWizard from "./EncerrarTurnoWizard";

export default async function EncerrarTurnoPage() {
  const sessao = await requireMotoboy();

  const turno = await prisma.turno.findFirst({
    where: { motoboyId: sessao.motoboyId, status: "ABERTO" },
    include: {
      cliente: { select: { nome: true } },
      taxaExtraItens: { orderBy: { ordem: "asc" }, select: { id: true, descricao: true } },
    },
  });
  if (!turno) redirect("/app/inicio");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-navy-900">Encerrar turno</h1>
      <EncerrarTurnoWizard clienteNome={turno.cliente.nome} taxasExtras={turno.taxaExtraItens} />
    </div>
  );
}

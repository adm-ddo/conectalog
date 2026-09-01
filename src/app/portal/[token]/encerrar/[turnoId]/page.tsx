import { notFound } from "next/navigation";
import { resolverClientePortal } from "@/lib/portal";
import { prisma } from "@/lib/prisma";
import EncerrarPeloClienteForm from "./EncerrarPeloClienteForm";

export default async function EncerrarPeloClientePage({
  params,
}: {
  params: Promise<{ token: string; turnoId: string }>;
}) {
  const { token, turnoId } = await params;
  const cliente = await resolverClientePortal(token);
  if (!cliente) notFound();

  const turno = await prisma.turno.findFirst({
    where: { id: Number(turnoId), clienteId: cliente.id },
    select: {
      id: true,
      motoboy: { select: { nomeCompleto: true } },
      taxaExtraItens: {
        orderBy: { ordem: "asc" },
        select: { id: true, descricao: true },
      },
    },
  });
  if (!turno) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-navy-900">Encerrar turno</h1>
      <EncerrarPeloClienteForm
        token={token}
        turnoId={turno.id}
        nomeMotoboy={turno.motoboy.nomeCompleto}
        taxasExtras={turno.taxaExtraItens}
      />
    </div>
  );
}

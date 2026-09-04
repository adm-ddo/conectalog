import { redirect } from "next/navigation";
import { requireMotoboyComEmpresa } from "@/lib/auth-motoboy";
import { prisma } from "@/lib/prisma";
import IniciarTurnoWizard from "./IniciarTurnoWizard";

export default async function IniciarTurnoPage() {
  const sessao = await requireMotoboyComEmpresa();

  const [motoboy, turnoAberto] = await Promise.all([
    prisma.motoboy.findUniqueOrThrow({
      where: { id: sessao.motoboyId },
      select: { livre: true },
    }),
    prisma.turno.findFirst({ where: { motoboyId: sessao.motoboyId, status: "ABERTO" } }),
  ]);
  if (turnoAberto) redirect("/app/inicio");

  const clientes = motoboy.livre
    ? await prisma.cliente.findMany({
        where: { empresaId: sessao.empresaId, ativo: true },
        orderBy: { nome: "asc" },
        select: { id: true, nome: true },
      })
    : await prisma.cliente
        .findMany({
          where: {
            empresaId: sessao.empresaId,
            ativo: true,
            motoboysLiberados: { some: { motoboyId: sessao.motoboyId, liberado: true } },
          },
          orderBy: { nome: "asc" },
          select: { id: true, nome: true },
        });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-navy-900">Iniciar turno</h1>
      <IniciarTurnoWizard clientes={clientes} />
    </div>
  );
}

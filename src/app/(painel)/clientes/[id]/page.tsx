import { notFound } from "next/navigation";
import { requireEmpresa } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { paraNumero } from "@/lib/valores";
import EditarClienteForm from "./EditarClienteForm";

export default async function ClienteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sessao = await requireEmpresa();
  const clienteId = Number((await params).id);

  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, empresaId: sessao.empresaId },
    include: {
      motoboysLiberados: {
        where: { liberado: true },
        include: { motoboy: { select: { id: true, nomeCompleto: true } } },
      },
      turnos: {
        where: { status: "ABERTO" },
        orderBy: { horaInicio: "asc" },
        select: { id: true, horaInicio: true, motoboy: { select: { nomeCompleto: true } } },
      },
    },
  });
  if (!cliente) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">{cliente.nome}</h1>
        <p className="text-stone-600 mt-1 text-sm">{cliente.endereco || "Sem endereço"}</p>
      </div>

      <EditarClienteForm
        cliente={{
          id: cliente.id,
          nome: cliente.nome,
          endereco: cliente.endereco,
          valorBanda: String(paraNumero(cliente.valorBanda)),
          valorTaxaExtra: String(paraNumero(cliente.valorTaxaExtra)),
        }}
      />

      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-navy-900 mb-3">
          Em turno agora ({cliente.turnos.length})
        </h2>
        {cliente.turnos.length === 0 ? (
          <p className="text-sm text-stone-500">Ninguém em turno neste cliente agora.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {cliente.turnos.map((t) => (
              <li key={t.id} className="text-sm text-stone-700">
                {t.motoboy.nomeCompleto} — desde{" "}
                {t.horaInicio.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-navy-900 mb-3">
          Motoboys liberados aqui ({cliente.motoboysLiberados.length})
        </h2>
        {cliente.motoboysLiberados.length === 0 ? (
          <p className="text-sm text-stone-500">
            Nenhum motoboy liberado ainda — libere pela página de cada motoboy.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {cliente.motoboysLiberados.map((mc) => (
              <li
                key={mc.id}
                className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700"
              >
                {mc.motoboy.nomeCompleto}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

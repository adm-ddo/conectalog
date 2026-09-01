import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { paraNumero } from "@/lib/valores";
import { turnoAtivoAgora, motosContratadasNoTurno } from "@/lib/equipe";
import EditarClienteForm from "./EditarClienteForm";
import LinkPortalSection from "./LinkPortalSection";
import EquipamentoBadge from "@/components/EquipamentoBadge";

export default async function ClienteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sessao = await requireTenant();
  const clienteId = Number((await params).id);

  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, empresaId: sessao.empresaEfetivoId },
    include: {
      motoboysLiberados: {
        where: { liberado: true },
        include: { motoboy: { select: { id: true, nomeCompleto: true, tipoEquipamento: true } } },
      },
      turnos: {
        where: { status: "ABERTO" },
        orderBy: { horaInicio: "asc" },
        select: {
          id: true,
          horaInicio: true,
          motoboy: { select: { nomeCompleto: true, tipoEquipamento: true } },
        },
      },
    },
  });
  if (!cliente) notFound();

  const turnoAtual = turnoAtivoAgora(cliente);
  const contratadas = motosContratadasNoTurno(cliente, turnoAtual);
  const equipeIncompleta = turnoAtual !== null && contratadas > 0 && cliente.turnos.length < contratadas;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">{cliente.nome}</h1>
        <p className="text-stone-600 mt-1 text-sm">{cliente.endereco || "Sem endereço"}</p>
      </div>

      {equipeIncompleta && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Faltam motos no turno de {turnoAtual === "MANHA" ? "manhã" : "noite"}: {cliente.turnos.length}{" "}
          de {contratadas} contratadas presentes agora.
        </div>
      )}

      <EditarClienteForm
        clienteId={cliente.id}
        valores={{
          nome: cliente.nome,
          endereco: cliente.endereco,
          turnoManhaAtivo: cliente.turnoManhaAtivo,
          turnoManhaInicio: cliente.turnoManhaInicio,
          turnoManhaFim: cliente.turnoManhaFim,
          motosFixasManha: cliente.motosFixasManha,
          turnoNoiteAtivo: cliente.turnoNoiteAtivo,
          turnoNoiteInicio: cliente.turnoNoiteInicio,
          turnoNoiteFim: cliente.turnoNoiteFim,
          motosFixasNoite: cliente.motosFixasNoite,
          valorBandaMotoboy: cliente.valorBandaMotoboy != null ? paraNumero(cliente.valorBandaMotoboy) : null,
          valorBandaCliente: cliente.valorBandaCliente != null ? paraNumero(cliente.valorBandaCliente) : null,
          valorTaxaExtraMotoboy:
            cliente.valorTaxaExtraMotoboy != null ? paraNumero(cliente.valorTaxaExtraMotoboy) : null,
          valorTaxaExtraCliente:
            cliente.valorTaxaExtraCliente != null ? paraNumero(cliente.valorTaxaExtraCliente) : null,
          valorDiariaMotoboy:
            cliente.valorDiariaMotoboy != null ? paraNumero(cliente.valorDiariaMotoboy) : null,
          valorDiariaCliente:
            cliente.valorDiariaCliente != null ? paraNumero(cliente.valorDiariaCliente) : null,
          bandasIncluidasNaDiaria: cliente.bandasIncluidasNaDiaria,
          valorBandaExcedenteMotoboy:
            cliente.valorBandaExcedenteMotoboy != null
              ? paraNumero(cliente.valorBandaExcedenteMotoboy)
              : null,
          valorBandaExcedenteCliente:
            cliente.valorBandaExcedenteCliente != null
              ? paraNumero(cliente.valorBandaExcedenteCliente)
              : null,
        }}
      />

      <LinkPortalSection clienteId={cliente.id} token={cliente.tokenPortal} />

      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-navy-900 mb-3">
          Em turno agora ({cliente.turnos.length})
        </h2>
        {cliente.turnos.length === 0 ? (
          <p className="text-sm text-stone-500">Ninguém em turno neste cliente agora.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {cliente.turnos.map((t) => (
              <li key={t.id} className="text-sm text-stone-700 flex items-center gap-2">
                {t.motoboy.nomeCompleto}
                <EquipamentoBadge tipo={t.motoboy.tipoEquipamento} />— desde{" "}
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
                className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700 flex items-center gap-1.5"
              >
                {mc.motoboy.nomeCompleto}
                <EquipamentoBadge tipo={mc.motoboy.tipoEquipamento} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

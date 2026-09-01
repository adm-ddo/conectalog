import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { formatarMoeda } from "@/lib/valores";
import { formatarData } from "@/lib/data";
import { paraNumero } from "@/lib/valores";
import LiberacaoClientes from "./LiberacaoClientes";
import ValesSection from "./ValesSection";
import OcorrenciasSection from "./OcorrenciasSection";
import AvaliacoesSection from "./AvaliacoesSection";
import EquipamentoSelector from "./EquipamentoSelector";
import EquipamentoBadge from "@/components/EquipamentoBadge";

export default async function MotoboyDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sessao = await requireTenant();
  const motoboyId = Number((await params).id);

  const [motoboy, clientes, mediaAvaliacoes] = await Promise.all([
    prisma.motoboy.findFirst({
      where: { id: motoboyId, empresaId: sessao.empresaEfetivoId },
      include: {
        clientesLiberados: true,
        vales: { orderBy: { data: "desc" } },
        ocorrencias: {
          orderBy: { criadoEm: "desc" },
          include: { cliente: { select: { nome: true } } },
        },
        avaliacoes: {
          orderBy: { criadoEm: "desc" },
          include: { cliente: { select: { nome: true } } },
        },
      },
    }),
    prisma.cliente.findMany({
      where: { empresaId: sessao.empresaEfetivoId, ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.avaliacao.aggregate({
      where: { motoboyId },
      _avg: { nota: true },
      _count: { _all: true },
    }),
  ]);
  if (!motoboy) notFound();

  const liberadosPorClienteId = new Map(
    motoboy.clientesLiberados.map((mc) => [mc.clienteId, mc.liberado])
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900 flex items-center gap-2">
          {motoboy.nomeCompleto}
          <EquipamentoBadge tipo={motoboy.tipoEquipamento} />
        </h1>
        <p className="text-stone-600 mt-1 text-sm">{motoboy.email}</p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <p>
          <span className="text-stone-500">CPF:</span> {motoboy.cpf}
        </p>
        <EquipamentoSelector motoboyId={motoboy.id} tipoEquipamento={motoboy.tipoEquipamento} />
        <p>
          <span className="text-stone-500">Celular:</span> {motoboy.telefoneCelular}
        </p>
        <p>
          <span className="text-stone-500">Emergência:</span> {motoboy.telefoneEmergencia}
        </p>
        <p>
          <span className="text-stone-500">Chave PIX:</span> {motoboy.chavePix} (
          {motoboy.tipoChavePix})
        </p>
        <p className="sm:col-span-2">
          <span className="text-stone-500">Endereço:</span> {motoboy.endereco}
        </p>
        <p>
          <span className="text-stone-500">Acesso ao app:</span>{" "}
          {motoboy.senhaHash ? "já configurado" : "ainda não configurado"}
        </p>
      </div>

      <LiberacaoClientes
        motoboyId={motoboy.id}
        livre={motoboy.livre}
        clientes={clientes.map((c) => ({
          id: c.id,
          nome: c.nome,
          liberado: liberadosPorClienteId.get(c.id) ?? false,
        }))}
      />

      <AvaliacoesSection
        media={paraNumero(mediaAvaliacoes._avg.nota)}
        total={mediaAvaliacoes._count._all}
        avaliacoes={motoboy.avaliacoes.map((a) => ({
          id: a.id,
          nota: a.nota,
          comentario: a.comentario,
          clienteNome: a.cliente.nome,
          data: formatarData(a.criadoEm),
        }))}
      />

      <OcorrenciasSection
        ocorrencias={motoboy.ocorrencias.map((o) => ({
          id: o.id,
          clienteNome: o.cliente.nome,
          descricao: o.descricao,
          valor: formatarMoeda(o.valorDesconto),
          data: formatarData(o.criadoEm),
          descontado: o.pagamentoId !== null,
        }))}
      />

      <ValesSection
        motoboyId={motoboy.id}
        vales={motoboy.vales.map((v) => ({
          id: v.id,
          valor: formatarMoeda(v.valor),
          observacao: v.observacao,
          data: formatarData(v.data),
          descontado: v.descontadoEm !== null,
        }))}
      />
    </div>
  );
}

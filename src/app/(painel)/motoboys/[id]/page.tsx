import { notFound } from "next/navigation";
import { requireEmpresa } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { formatarMoeda } from "@/lib/valores";
import LiberacaoClientes from "./LiberacaoClientes";
import ValesSection from "./ValesSection";
import EquipamentoSelector from "./EquipamentoSelector";
import EquipamentoBadge from "@/components/EquipamentoBadge";

export default async function MotoboyDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sessao = await requireEmpresa();
  const motoboyId = Number((await params).id);

  const [motoboy, clientes] = await Promise.all([
    prisma.motoboy.findFirst({
      where: { id: motoboyId, empresaId: sessao.empresaId },
      include: {
        clientesLiberados: true,
        vales: { orderBy: { data: "desc" } },
      },
    }),
    prisma.cliente.findMany({
      where: { empresaId: sessao.empresaId, ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
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

      <ValesSection
        motoboyId={motoboy.id}
        vales={motoboy.vales.map((v) => ({
          id: v.id,
          valor: formatarMoeda(v.valor),
          observacao: v.observacao,
          data: v.data.toLocaleDateString("pt-BR"),
          descontado: v.descontadoEm !== null,
        }))}
      />
    </div>
  );
}

import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { formatarMoeda } from "@/lib/valores";
import { formatarData } from "@/lib/data";
import { paraNumero } from "@/lib/valores";
import { baixarComoDataUrl } from "@/lib/blob";
import LiberacaoClientes from "./LiberacaoClientes";
import ValesSection from "./ValesSection";
import OcorrenciasSection from "./OcorrenciasSection";
import AvaliacoesSection from "./AvaliacoesSection";
import DescontosAssiduidadeSection from "./DescontosAssiduidadeSection";
import DescontoAssiduidadeToggle from "./DescontoAssiduidadeToggle";
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
        descontosAssiduidade: {
          orderBy: { criadoEm: "desc" },
          include: { turno: { include: { cliente: { select: { nome: true } } } } },
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

  // Foto de perfil e CNH ficam privadas no Blob — só dá pra exibir
  // baixando aqui no servidor (depois de já ter confirmado que esse
  // motoboy é da cooperativa de quem está logado) e embutindo como data
  // URL, nunca expondo a URL crua do Blob pro navegador.
  const [fotoPerfilDataUrl, cnhDataUrl] = await Promise.all([
    motoboy.fotoPerfilUrl ? baixarComoDataUrl(motoboy.fotoPerfilUrl).catch(() => null) : null,
    motoboy.cnhFotoUrl ? baixarComoDataUrl(motoboy.cnhFotoUrl).catch(() => null) : null,
  ]);
  const cnhEhPdf = cnhDataUrl?.startsWith("data:application/pdf") ?? false;

  const enderecoCompleto = [
    motoboy.endereco,
    motoboy.numero,
    motoboy.complemento,
    motoboy.bairro,
    motoboy.cidade,
    motoboy.cep,
  ]
    .filter(Boolean)
    .join(", ");

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
          <span className="text-stone-500">Data de nascimento:</span>{" "}
          {formatarData(motoboy.dataNascimento)}
        </p>
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
          <span className="text-stone-500">Endereço:</span> {enderecoCompleto || "Não informado"}
        </p>
        <p>
          <span className="text-stone-500">Acesso ao app:</span>{" "}
          {motoboy.senhaHash ? "já configurado" : "ainda não configurado"}
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-navy-900">Documentos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs text-stone-500">Foto de perfil</span>
            {fotoPerfilDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL baixada do Blob privado, next/image não se aplica
              <img
                src={fotoPerfilDataUrl}
                alt={`Foto de ${motoboy.nomeCompleto}`}
                className="w-40 h-40 rounded-xl object-cover border border-stone-200"
              />
            ) : (
              <p className="text-sm text-stone-400">Ainda não enviou.</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs text-stone-500">CNH</span>
            {!cnhDataUrl ? (
              <p className="text-sm text-stone-400">Ainda não enviou.</p>
            ) : cnhEhPdf ? (
              <div className="flex flex-col gap-2">
                <iframe src={cnhDataUrl} className="w-full h-64 rounded-xl border border-stone-200" />
                <a
                  href={cnhDataUrl}
                  download={`cnh-${motoboy.nomeCompleto}.pdf`}
                  className="text-xs text-brand-700 underline self-start"
                >
                  Baixar PDF
                </a>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- data URL baixada do Blob privado, next/image não se aplica
              <img
                src={cnhDataUrl}
                alt={`CNH de ${motoboy.nomeCompleto}`}
                className="w-full max-w-sm rounded-xl object-contain border border-stone-200"
              />
            )}
          </div>
        </div>
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

      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <DescontoAssiduidadeToggle motoboyId={motoboy.id} ativo={motoboy.descontoAssiduidadeAtivo} />
        <p className="text-xs text-stone-500 mt-1">
          Se ele chegar atrasado (tolerância e valores configuráveis em Configurações) num turno
          com horário definido no cliente, o desconto é aplicado sozinho no próximo pagamento.
        </p>
      </div>

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

      <DescontosAssiduidadeSection
        descontos={motoboy.descontosAssiduidade.map((d) => ({
          id: d.id,
          clienteNome: d.turno.cliente.nome,
          minutosAtraso: d.minutosAtraso,
          valor: formatarMoeda(d.valorDesconto),
          data: formatarData(d.criadoEm),
          descontado: d.pagamentoId !== null,
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

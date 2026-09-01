import { requireEmpresa } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { paraNumero } from "@/lib/valores";
import LogoForm from "./LogoForm";
import ValoresPadraoForm from "./ValoresPadraoForm";

export default async function ConfiguracoesPage() {
  const sessao = await requireEmpresa();

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: sessao.empresaId },
    select: {
      logoUrl: true,
      valorBandaMotoboyPadrao: true,
      valorBandaClientePadrao: true,
      valorTaxaExtraMotoboyPadrao: true,
      valorTaxaExtraClientePadrao: true,
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Configurações</h1>
        <p className="text-stone-600 mt-1 text-sm">Identidade e valores padrão da cooperativa.</p>
      </div>

      <LogoForm logoUrlAtual={empresa.logoUrl} />
      <ValoresPadraoForm
        valorBandaMotoboyPadrao={paraNumero(empresa.valorBandaMotoboyPadrao)}
        valorBandaClientePadrao={paraNumero(empresa.valorBandaClientePadrao)}
        valorTaxaExtraMotoboyPadrao={paraNumero(empresa.valorTaxaExtraMotoboyPadrao)}
        valorTaxaExtraClientePadrao={paraNumero(empresa.valorTaxaExtraClientePadrao)}
      />
    </div>
  );
}

import { requireTenant } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";
import { paraNumero } from "@/lib/valores";
import LogoForm from "./LogoForm";
import ValoresPadraoForm from "./ValoresPadraoForm";
import AssiduidadeForm from "./AssiduidadeForm";
import LinkCadastroMotoboySection from "./LinkCadastroMotoboySection";

export default async function ConfiguracoesPage() {
  const sessao = await requireTenant();

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: sessao.empresaEfetivoId },
    select: {
      logoUrl: true,
      valorBandaMotoboyPadrao: true,
      valorBandaClientePadrao: true,
      tokenCadastroMotoboy: true,
      toleranciaAtrasoMinutos: true,
      valorDescontoAtrasoManha: true,
      valorDescontoAtrasoTarde: true,
      valorDescontoAtrasoNoite: true,
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Configurações</h1>
        <p className="text-stone-600 mt-1 text-sm">Identidade e valores padrão da cooperativa.</p>
      </div>

      <LogoForm logoUrlAtual={empresa.logoUrl} />
      <LinkCadastroMotoboySection token={empresa.tokenCadastroMotoboy} />
      <ValoresPadraoForm
        valorBandaMotoboyPadrao={paraNumero(empresa.valorBandaMotoboyPadrao)}
        valorBandaClientePadrao={paraNumero(empresa.valorBandaClientePadrao)}
      />
      <AssiduidadeForm
        toleranciaAtrasoMinutos={empresa.toleranciaAtrasoMinutos}
        valorDescontoAtrasoManha={paraNumero(empresa.valorDescontoAtrasoManha)}
        valorDescontoAtrasoTarde={paraNumero(empresa.valorDescontoAtrasoTarde)}
        valorDescontoAtrasoNoite={paraNumero(empresa.valorDescontoAtrasoNoite)}
      />
    </div>
  );
}

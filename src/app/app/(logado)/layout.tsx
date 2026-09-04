import { requireMotoboy } from "@/lib/auth-motoboy";
import { prisma } from "@/lib/prisma";
import { sairMotoboy } from "./actions";
import AppHeader from "./AppHeader";
import SemCooperativaScreen from "./SemCooperativaScreen";
import AguardandoAprovacaoScreen from "./AguardandoAprovacaoScreen";

function CabecalhoMinimo({ nome }: { nome: string }) {
  return (
    <header className="bg-white border-b border-stone-200">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        <span className="font-black text-navy-900 tracking-tight">
          Conecta<span className="text-brand-600">Log</span>
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-500">Olá, {nome.split(" ")[0]}</span>
          <form action={sairMotoboy}>
            <button type="submit" className="text-xs text-stone-500 underline underline-offset-2">
              Sair
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

export default async function AppLogadoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await requireMotoboy();

  // "Na prateleira" — ainda não escolheu (nem foi escolhido por) nenhuma
  // cooperativa. Mostra a tela de escolha em vez do app normal, que
  // depende de ter uma empresa pra tudo (turno, escala, relatório...).
  if (sessao.empresaId === null) {
    const empresas = await prisma.empresa.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    });
    return (
      <div className="flex-1 flex flex-col bg-stone-50">
        <CabecalhoMinimo nome={sessao.nomeCompleto} />
        <main className="flex-1 max-w-md w-full mx-auto px-4 py-6 flex flex-col">
          <SemCooperativaScreen empresas={empresas} />
        </main>
      </div>
    );
  }

  // Escolheu uma cooperativa, mas ela ainda não aprovou o pedido.
  if (sessao.aprovadoEm === null) {
    const empresa = await prisma.empresa.findUniqueOrThrow({
      where: { id: sessao.empresaId },
      select: { nome: true },
    });
    return (
      <div className="flex-1 flex flex-col bg-stone-50">
        <CabecalhoMinimo nome={sessao.nomeCompleto} />
        <main className="flex-1 max-w-md w-full mx-auto px-4 py-6 flex flex-col">
          <AguardandoAprovacaoScreen empresaNome={empresa.nome} />
        </main>
      </div>
    );
  }

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: sessao.empresaId },
    select: { nome: true, logoUrl: true },
  });

  return (
    <div className="flex-1 flex flex-col bg-stone-50">
      <AppHeader
        nome={sessao.nomeCompleto}
        logoUrl={empresa.logoUrl}
        empresaNome={empresa.nome}
        ehGestor={sessao.ehGestor}
        email={sessao.email}
      />
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-6 flex flex-col">{children}</main>
    </div>
  );
}

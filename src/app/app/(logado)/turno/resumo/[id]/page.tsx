import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMotoboy } from "@/lib/auth-motoboy";
import { prisma } from "@/lib/prisma";
import { formatarMoeda } from "@/lib/valores";

export default async function ResumoTurnoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sessao = await requireMotoboy();
  const turnoId = Number((await params).id);

  const turno = await prisma.turno.findFirst({
    where: { id: turnoId, motoboyId: sessao.motoboyId },
    include: {
      cliente: { select: { nome: true } },
      apoios: { select: { quantidadeBandas: true, quantidadeTaxasExtras: true, valorTotal: true } },
    },
  });
  if (!turno) notFound();

  const totalBandasApoios = turno.apoios.reduce((s, a) => s + a.quantidadeBandas, 0);
  const totalValorApoios = turno.apoios.reduce((s, a) => s + Number(a.valorTotal), 0);
  const valorTurno = Number(turno.valorTotal ?? 0);

  return (
    <div className="flex flex-col gap-6 items-center text-center">
      <div className="h-14 w-14 rounded-full bg-brand-100 flex items-center justify-center text-2xl">
        ✅
      </div>
      <div>
        <h1 className="text-lg font-semibold text-navy-900">Turno encerrado</h1>
        <p className="text-sm text-stone-500">{turno.cliente.nome}</p>
      </div>

      <div className="w-full rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-3 text-left">
        <div className="flex justify-between text-sm">
          <span className="text-stone-500">Bandas no turno</span>
          <span className="font-semibold text-navy-900">{turno.quantidadeBandas}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-stone-500">Taxas extras</span>
          <span className="font-semibold text-navy-900">{turno.quantidadeTaxasExtras}</span>
        </div>
        {turno.apoios.length > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">Bandas em apoio ({turno.apoios.length})</span>
            <span className="font-semibold text-navy-900">{totalBandasApoios}</span>
          </div>
        )}
        <hr className="border-stone-100" />
        <div className="flex justify-between text-base">
          <span className="font-semibold text-navy-900">Total a receber</span>
          <span className="font-bold text-brand-700">
            R$ {formatarMoeda(valorTurno + totalValorApoios)}
          </span>
        </div>
      </div>

      <Link
        href="/app/inicio"
        className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-3 transition-colors"
      >
        Voltar ao início
      </Link>
    </div>
  );
}

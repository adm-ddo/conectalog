import type { TipoEquipamento } from "@/generated/prisma/enums";
import { LABEL_EQUIPAMENTO_CURTO } from "@/lib/equipamento";

/** Mostrado ao lado do nome do motoboy em toda tela (painel e portal do
 * cliente) — decisão do Thiago, pra quem escala saber na hora se aquele
 * motoboy dá conta de pizza grande ou não. */
export default function EquipamentoBadge({
  tipo,
}: {
  tipo: TipoEquipamento | null;
}) {
  if (!tipo) {
    return (
      <span className="rounded-full bg-stone-100 text-stone-500 px-2 py-0.5 text-[10px] font-medium">
        equipamento não informado
      </span>
    );
  }

  return (
    <span className="rounded-full bg-navy-100 text-navy-700 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap">
      {LABEL_EQUIPAMENTO_CURTO[tipo]}
    </span>
  );
}

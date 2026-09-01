import type { TipoEquipamento } from "@/generated/prisma/enums";

export const LABEL_EQUIPAMENTO: Record<TipoEquipamento, string> = {
  BAG: "Bag (mochila)",
  BAU_PEQUENO: "Baú pequeno",
  BAU_MEDIO: "Baú médio",
  BAU_GRANDE: "Baú grande (pizza 45cm)",
};

export const LABEL_EQUIPAMENTO_CURTO: Record<TipoEquipamento, string> = {
  BAG: "Bag",
  BAU_PEQUENO: "Baú P",
  BAU_MEDIO: "Baú M",
  BAU_GRANDE: "Baú G (45cm)",
};

const MENSAGENS_LONGE = [
  "Bora começar! Cada banda te deixa mais perto da meta.",
  "Ainda tem chão pela frente, mas todo turno conta.",
  "Foco no próximo turno — a meta não sai do lugar sozinha.",
];

const MENSAGENS_PERTO = [
  "Falta pouco! Você já está quase lá.",
  "Mais um esforço e a meta é sua.",
  "Tá on fire — não para agora!",
];

const MENSAGENS_BATIDA = [
  "Meta batida! Manda ver na próxima.",
  "Você conseguiu! Hora de comemorar (e talvez criar uma meta nova).",
  "Show de bola — meta concluída!",
];

function escolher(lista: string[]): string {
  return lista[Math.floor(Math.random() * lista.length)];
}

/** Mensagem aleatória baseada no progresso (0 a 1+) rumo à meta. */
export function mensagemMotivacional(progresso: number): string {
  if (progresso >= 1) return escolher(MENSAGENS_BATIDA);
  if (progresso >= 0.7) return escolher(MENSAGENS_PERTO);
  return escolher(MENSAGENS_LONGE);
}

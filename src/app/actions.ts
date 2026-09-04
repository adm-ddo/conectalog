"use server";

import { prisma } from "@/lib/prisma";
import { enviarEmailLeadComercial } from "@/lib/email";

export type ContatoComercialState = { erro?: string; sucesso?: boolean } | undefined;

/** Pedido de contato da landing comercial (raiz do domínio) — fica salvo
 * em LeadComercial (pra nunca se perder) e dispara um e-mail de aviso pro
 * Thiago. Não precisa de sessão nenhuma: é a porta de entrada de gente
 * que ainda nem é cliente. */
export async function enviarContatoComercial(
  _prev: ContatoComercialState,
  formData: FormData
): Promise<ContatoComercialState> {
  const nome = String(formData.get("nome") ?? "").trim();
  const contato = String(formData.get("contato") ?? "").trim();
  const mensagem = String(formData.get("mensagem") ?? "").trim() || null;

  if (!nome || !contato) {
    return { erro: "Preencha seu nome e um jeito de te chamar de volta (telefone ou e-mail)." };
  }

  await prisma.leadComercial.create({ data: { nome, contato, mensagem } });
  await enviarEmailLeadComercial({ nome, contato, mensagem });

  return { sucesso: true };
}

"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buscarTokenMotoboyValido, criarSessaoMotoboy } from "@/lib/auth-motoboy";

export type ConfirmarEmailState = { erro?: string } | undefined;

/** Consome o token só quando a pessoa clica no botão de confirmar — não
 * na simples abertura do link (GET). Evita que scanners de segurança de
 * e-mail corporativo, que abrem o link sozinhos, gastem o token antes da
 * pessoa de verdade clicar. Mesmo padrão do extras-app. */
export async function confirmarVerificacaoEmailMotoboy(
  _prev: ConfirmarEmailState,
  formData: FormData
): Promise<ConfirmarEmailState> {
  const token = String(formData.get("token") ?? "");
  const resultado = await buscarTokenMotoboyValido(token, "VERIFICACAO_EMAIL");
  if (!resultado.valido) {
    return { erro: "Esse link não é mais válido — peça um novo na tela de login." };
  }

  await prisma.$transaction([
    prisma.motoboy.update({
      where: { id: resultado.motoboyId },
      data: { emailVerificadoEm: new Date() },
    }),
    prisma.tokenAutenticacaoMotoboy.update({
      where: { id: resultado.tokenId },
      data: { usadoEm: new Date() },
    }),
  ]);

  await criarSessaoMotoboy(resultado.motoboyId);
  redirect("/app/inicio");
}

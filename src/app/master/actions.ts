"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin, entrarNaEmpresaComoSuperAdmin } from "@/lib/auth-empresa";
import { prisma } from "@/lib/prisma";

export async function entrarNaEmpresa(empresaId: number) {
  await requireSuperAdmin();
  await entrarNaEmpresaComoSuperAdmin(empresaId);
  redirect("/dashboard");
}

export type RenomearEmpresaResult = { erro?: string } | undefined;

export async function renomearEmpresa(
  empresaId: number,
  novoNome: string
): Promise<RenomearEmpresaResult> {
  await requireSuperAdmin();
  const nome = novoNome.trim();
  if (!nome) return { erro: "O nome não pode ficar em branco." };

  await prisma.empresa.update({ where: { id: empresaId }, data: { nome } });
  revalidatePath("/master");
}

export type ExcluirEmpresaResult = { erro?: string } | undefined;

/** Apaga a cooperativa e TUDO que é dela em cascata (clientes, motoboys,
 * turnos, pagamentos, escalas...) — ver onDelete: Cascade no schema a
 * partir de Empresa. Não tem como desfazer, por isso a confirmação com o
 * nome digitado fica no componente antes de sequer chamar essa action. */
export async function excluirEmpresa(empresaId: number): Promise<ExcluirEmpresaResult> {
  const sessao = await requireSuperAdmin();
  // A cooperativa "dona" do próprio login master nunca pode ser
  // excluída por aqui: Usuario.empresa é onDelete: Cascade, então isso
  // apagaria a própria conta (e a sessão atual) em cascata, trancando o
  // superAdmin pra fora do /master pra sempre, sem forma de entrar de
  // novo.
  if (empresaId === sessao.empresaHomeId) {
    return { erro: "Essa é a cooperativa do seu próprio login master — não dá pra excluir ela." };
  }

  await prisma.empresa.delete({ where: { id: empresaId } });
  revalidatePath("/master");
  return;
}

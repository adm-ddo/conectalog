"use server";

import { redirect } from "next/navigation";
import { requireSuperAdmin, entrarNaEmpresaComoSuperAdmin } from "@/lib/auth-empresa";

export async function entrarNaEmpresa(empresaId: number) {
  await requireSuperAdmin();
  await entrarNaEmpresaComoSuperAdmin(empresaId);
  redirect("/dashboard");
}

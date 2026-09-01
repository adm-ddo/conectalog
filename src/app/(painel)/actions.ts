"use server";

import { redirect } from "next/navigation";
import { destruirSessaoEmpresaAtual } from "@/lib/auth-empresa";

export async function sair() {
  await destruirSessaoEmpresaAtual();
  redirect("/login");
}

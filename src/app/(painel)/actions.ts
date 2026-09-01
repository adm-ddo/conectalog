"use server";

import { redirect } from "next/navigation";
import { destruirSessaoEmpresaAtual, sairDaEmpresaAtiva } from "@/lib/auth-empresa";

export async function sair() {
  await destruirSessaoEmpresaAtual();
  redirect("/login");
}

export async function voltarAoMaster() {
  await sairDaEmpresaAtiva();
  redirect("/master");
}

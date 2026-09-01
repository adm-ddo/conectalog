"use server";

import { redirect } from "next/navigation";
import { destruirSessaoClienteAtual } from "@/lib/auth-cliente";

export async function sairPortal() {
  await destruirSessaoClienteAtual();
  redirect("/portal/entrar");
}

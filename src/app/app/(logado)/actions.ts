"use server";

import { redirect } from "next/navigation";
import { destruirSessaoMotoboyAtual } from "@/lib/auth-motoboy";

export async function sairMotoboy() {
  await destruirSessaoMotoboyAtual();
  redirect("/app/entrar");
}

"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMotoboy } from "@/lib/auth-motoboy";
import { uploadDataUrl } from "@/lib/blob";
import type { TurnoPredefinido } from "@/generated/prisma/enums";

export type IniciarTurnoState = { erro?: string } | undefined;

export type DadosIniciarTurno = {
  clienteId: number;
  turnoPredefinido: TurnoPredefinido;
  fotoInicioDataUrl: string;
  assinaturaTermoDataUrl: string;
};

export async function iniciarTurno(dados: DadosIniciarTurno): Promise<IniciarTurnoState> {
  const sessao = await requireMotoboy();

  const motoboy = await prisma.motoboy.findUniqueOrThrow({
    where: { id: sessao.motoboyId },
    select: { livre: true },
  });

  if (!motoboy.livre) {
    const liberacao = await prisma.motoboyCliente.findUnique({
      where: { motoboyId_clienteId: { motoboyId: sessao.motoboyId, clienteId: dados.clienteId } },
    });
    if (!liberacao?.liberado) {
      return { erro: "Você não está liberado pra trabalhar nesse cliente." };
    }
  }

  const cliente = await prisma.cliente.findFirst({
    where: { id: dados.clienteId, empresaId: sessao.empresaId, ativo: true },
  });
  if (!cliente) return { erro: "Cliente inválido." };

  const jaEmTurno = await prisma.turno.findFirst({
    where: { motoboyId: sessao.motoboyId, status: "ABERTO" },
  });
  if (jaEmTurno) return { erro: "Você já está com um turno em aberto." };

  if (!dados.fotoInicioDataUrl || !dados.assinaturaTermoDataUrl) {
    return { erro: "Falta a foto ou a assinatura." };
  }

  const [fotoInicioUrl, assinaturaTermoUrl] = await Promise.all([
    uploadDataUrl(`turnos/foto-inicio-${Date.now()}.jpg`, dados.fotoInicioDataUrl),
    uploadDataUrl(`turnos/assinatura-termo-${Date.now()}.png`, dados.assinaturaTermoDataUrl),
  ]);

  await prisma.turno.create({
    data: {
      motoboyId: sessao.motoboyId,
      clienteId: dados.clienteId,
      turnoPredefinido: dados.turnoPredefinido,
      fotoInicioUrl,
      assinaturaTermoUrl,
    },
  });

  redirect("/app/inicio");
}

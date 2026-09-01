"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth-empresa";

export type ClienteFormState = { erro?: string } | undefined;

function decimalOpcional(formData: FormData, campo: string): number | null {
  const texto = String(formData.get(campo) ?? "").trim();
  if (!texto) return null;
  const numero = Number(texto);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

function intOpcional(formData: FormData, campo: string): number | null {
  const texto = String(formData.get(campo) ?? "").trim();
  if (!texto) return null;
  const numero = Number(texto);
  return Number.isInteger(numero) && numero >= 0 ? numero : null;
}

function textoOpcional(formData: FormData, campo: string): string | null {
  return String(formData.get(campo) ?? "").trim() || null;
}

/** Monta o array de 7 posições (índice = Date.getDay(), 0=domingo...
 * 6=sábado) a partir dos campos individuais `motosFixas${prefixo}${dia}`
 * do form — dia sem valor preenchido vira 0 (sem moto fixa esse dia). */
function motosPorDiaSemana(formData: FormData, prefixo: "Manha" | "Noite"): number[] {
  return Array.from({ length: 7 }, (_, dia) => intOpcional(formData, `motosFixas${prefixo}${dia}`) ?? 0);
}

type TaxaExtraInput = { ordem: number; descricao: string; valorMotoboy: number; valorCliente: number };

/** Monta a lista de faixas de taxa extra a partir dos campos dinâmicos
 * `taxaExtra{Descricao,ValorMotoboy,ValorCliente}_${i}` do form — linhas
 * sem descrição preenchida são ignoradas (ex.: usuário adicionou uma
 * linha e desistiu sem apagar). */
function parseTaxasExtras(formData: FormData): TaxaExtraInput[] {
  const count = Number(formData.get("taxaExtraCount") ?? 0);
  const itens: TaxaExtraInput[] = [];
  for (let i = 0; i < count; i++) {
    const descricao = String(formData.get(`taxaExtraDescricao_${i}`) ?? "").trim();
    if (!descricao) continue;
    itens.push({
      ordem: itens.length + 1,
      descricao,
      valorMotoboy: decimalOpcional(formData, `taxaExtraValorMotoboy_${i}`) ?? 0,
      valorCliente: decimalOpcional(formData, `taxaExtraValorCliente_${i}`) ?? 0,
    });
  }
  return itens;
}

/** Monta os campos de preço/horário/diária comuns a criar e atualizar —
 * a diária só entra se "usarDiaria" veio marcado no form (senão os
 * campos ficam null, caindo no modelo "por banda" normal). */
function dadosComuns(formData: FormData) {
  const usarDiaria = formData.get("usarDiaria") === "on";

  return {
    endereco: textoOpcional(formData, "endereco"),

    turnoManhaAtivo: formData.get("turnoManhaAtivo") === "on",
    turnoManhaInicio: textoOpcional(formData, "turnoManhaInicio"),
    turnoManhaFim: textoOpcional(formData, "turnoManhaFim"),
    motosFixasManha: motosPorDiaSemana(formData, "Manha"),

    turnoNoiteAtivo: formData.get("turnoNoiteAtivo") === "on",
    turnoNoiteInicio: textoOpcional(formData, "turnoNoiteInicio"),
    turnoNoiteFim: textoOpcional(formData, "turnoNoiteFim"),
    motosFixasNoite: motosPorDiaSemana(formData, "Noite"),

    valorBandaMotoboy: decimalOpcional(formData, "valorBandaMotoboy"),
    valorBandaCliente: decimalOpcional(formData, "valorBandaCliente"),

    valorDiariaMotoboy: usarDiaria ? decimalOpcional(formData, "valorDiariaMotoboy") : null,
    valorDiariaCliente: usarDiaria ? decimalOpcional(formData, "valorDiariaCliente") : null,
    bandasIncluidasNaDiaria: usarDiaria ? intOpcional(formData, "bandasIncluidasNaDiaria") : null,
    valorBandaExcedenteMotoboy: usarDiaria
      ? decimalOpcional(formData, "valorBandaExcedenteMotoboy")
      : null,
    valorBandaExcedenteCliente: usarDiaria
      ? decimalOpcional(formData, "valorBandaExcedenteCliente")
      : null,
  };
}

export async function criarCliente(
  _prev: ClienteFormState,
  formData: FormData
): Promise<ClienteFormState> {
  const sessao = await requireTenant();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { erro: "Informe o nome do cliente." };

  // Já nasce com o link do portal pronto — mesmo espírito do Totem do
  // extras-app: a cooperativa recebe o link já na hora de cadastrar,
  // sem precisar de um passo separado depois.
  await prisma.cliente.create({
    data: {
      empresaId: sessao.empresaEfetivoId,
      nome,
      tokenPortal: randomBytes(16).toString("hex"),
      ...dadosComuns(formData),
      taxasExtras: { create: parseTaxasExtras(formData) },
    },
  });

  revalidatePath("/clientes");
}

export async function atualizarCliente(
  clienteId: number,
  _prev: ClienteFormState,
  formData: FormData
): Promise<ClienteFormState> {
  const sessao = await requireTenant();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { erro: "Informe o nome do cliente." };

  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, empresaId: sessao.empresaEfetivoId },
    select: { id: true },
  });
  if (!cliente) return { erro: "Cliente não encontrado." };

  const taxasExtras = parseTaxasExtras(formData);

  // Recriar a lista do zero é mais simples que casar item a item (a
  // cooperativa pode reordenar, remover do meio, editar texto e valor ao
  // mesmo tempo) — turnos/apoios já fechados guardam seu próprio snapshot
  // de descrição/valor, então não perdem nada quando a faixa de origem é
  // apagada (só o vínculo de rastreabilidade fica null).
  await prisma.$transaction([
    prisma.cliente.update({
      where: { id: clienteId },
      data: { nome, ...dadosComuns(formData) },
    }),
    prisma.clienteTaxaExtra.deleteMany({ where: { clienteId } }),
    prisma.clienteTaxaExtra.createMany({
      data: taxasExtras.map((t) => ({ ...t, clienteId })),
    }),
  ]);

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clienteId}`);
}

export async function alternarAtivoCliente(clienteId: number, ativo: boolean) {
  const sessao = await requireTenant();
  await prisma.cliente.updateMany({
    where: { id: clienteId, empresaId: sessao.empresaEfetivoId },
    data: { ativo },
  });
  revalidatePath("/clientes");
}

/** Troca o link do portal por um novo — útil se o link vazou ou se
 * precisar revogar o acesso de quem tinha o link antigo salvo. */
export async function regenerarTokenPortal(clienteId: number) {
  const sessao = await requireTenant();
  await prisma.cliente.updateMany({
    where: { id: clienteId, empresaId: sessao.empresaEfetivoId },
    data: { tokenPortal: randomBytes(16).toString("hex") },
  });
  revalidatePath(`/clientes/${clienteId}`);
}

"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireTenantCompleto } from "@/lib/auth-empresa";

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
function motosPorDiaSemana(formData: FormData, prefixo: "Manha" | "Tarde" | "Noite"): number[] {
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

type TurnoFixoInput = {
  nome: string;
  horaInicio: string;
  horaFim: string;
  diasSemana: number[];
  valorGarantidoMotoboy: number;
  valorGarantidoCliente: number;
  bandasIncluidas: number;
  valorExcedenteMotoboy: number;
  valorExcedenteCliente: number;
  carenciaCliente: boolean;
  bandasIncluidasCliente: number;
};

/** Monta a lista de perfis de "valor fixo por turno" a partir dos campos
 * dinâmicos `turnoFixo{Campo}_${i}` do form — perfil sem nome preenchido
 * é ignorado (linha adicionada e não preenchida). */
function parseTurnosFixos(formData: FormData): TurnoFixoInput[] {
  const count = Number(formData.get("turnoFixoCount") ?? 0);
  const itens: TurnoFixoInput[] = [];
  for (let i = 0; i < count; i++) {
    const nome = String(formData.get(`turnoFixoNome_${i}`) ?? "").trim();
    if (!nome) continue;
    const diasSemana = Array.from({ length: 7 }, (_, dia) => dia).filter(
      (dia) => formData.get(`turnoFixoDia_${i}_${dia}`) === "on"
    );
    itens.push({
      nome,
      horaInicio: String(formData.get(`turnoFixoHoraInicio_${i}`) ?? "").trim() || "00:00",
      horaFim: String(formData.get(`turnoFixoHoraFim_${i}`) ?? "").trim() || "23:59",
      diasSemana,
      valorGarantidoMotoboy: decimalOpcional(formData, `turnoFixoValorGarantidoMotoboy_${i}`) ?? 0,
      valorGarantidoCliente: decimalOpcional(formData, `turnoFixoValorGarantidoCliente_${i}`) ?? 0,
      bandasIncluidas: intOpcional(formData, `turnoFixoBandasIncluidas_${i}`) ?? 0,
      valorExcedenteMotoboy: decimalOpcional(formData, `turnoFixoValorExcedenteMotoboy_${i}`) ?? 0,
      valorExcedenteCliente: decimalOpcional(formData, `turnoFixoValorExcedenteCliente_${i}`) ?? 0,
      carenciaCliente: formData.get(`turnoFixoCarenciaCliente_${i}`) === "on",
      bandasIncluidasCliente: intOpcional(formData, `turnoFixoBandasIncluidasCliente_${i}`) ?? 0,
    });
  }
  return itens;
}

/** Perfil de valor fixo sem nenhum dia marcado nunca bate em
 * encontrarPerfilFixo (ver src/lib/precificacao.ts) — fica salvo mas não
 * faz nada, o que é mais confuso do que simplesmente avisar na hora. */
function validarTurnosFixos(turnosFixos: TurnoFixoInput[]): string | null {
  const semDias = turnosFixos.find((t) => t.diasSemana.length === 0);
  if (semDias) return `Selecione pelo menos um dia da semana pro perfil "${semDias.nome}".`;
  return null;
}

/** Monta os campos de preço/horário comuns a criar e atualizar. */
function dadosComuns(formData: FormData) {
  return {
    endereco: textoOpcional(formData, "endereco"),
    contatoFinanceiroNome: textoOpcional(formData, "contatoFinanceiroNome"),
    contatoFinanceiroEmail: textoOpcional(formData, "contatoFinanceiroEmail"),

    turnoManhaAtivo: formData.get("turnoManhaAtivo") === "on",
    turnoManhaInicio: textoOpcional(formData, "turnoManhaInicio"),
    turnoManhaFim: textoOpcional(formData, "turnoManhaFim"),
    motosFixasManha: motosPorDiaSemana(formData, "Manha"),

    turnoTardeAtivo: formData.get("turnoTardeAtivo") === "on",
    turnoTardeInicio: textoOpcional(formData, "turnoTardeInicio"),
    turnoTardeFim: textoOpcional(formData, "turnoTardeFim"),
    motosFixasTarde: motosPorDiaSemana(formData, "Tarde"),

    turnoNoiteAtivo: formData.get("turnoNoiteAtivo") === "on",
    turnoNoiteInicio: textoOpcional(formData, "turnoNoiteInicio"),
    turnoNoiteFim: textoOpcional(formData, "turnoNoiteFim"),
    motosFixasNoite: motosPorDiaSemana(formData, "Noite"),

    valorBandaMotoboy: decimalOpcional(formData, "valorBandaMotoboy"),
    valorBandaCliente: decimalOpcional(formData, "valorBandaCliente"),
  };
}

export async function criarCliente(
  _prev: ClienteFormState,
  formData: FormData
): Promise<ClienteFormState> {
  const sessao = await requireTenantCompleto();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { erro: "Informe o nome do cliente." };

  const turnosFixos = parseTurnosFixos(formData);
  const erroTurnosFixos = validarTurnosFixos(turnosFixos);
  if (erroTurnosFixos) return { erro: erroTurnosFixos };

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
      turnosFixos: { create: turnosFixos },
    },
  });

  revalidatePath("/clientes");
}

export async function atualizarCliente(
  clienteId: number,
  _prev: ClienteFormState,
  formData: FormData
): Promise<ClienteFormState> {
  const sessao = await requireTenantCompleto();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { erro: "Informe o nome do cliente." };

  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, empresaId: sessao.empresaEfetivoId },
    select: { id: true },
  });
  if (!cliente) return { erro: "Cliente não encontrado." };

  const taxasExtras = parseTaxasExtras(formData);
  const turnosFixos = parseTurnosFixos(formData);
  const erroTurnosFixos = validarTurnosFixos(turnosFixos);
  if (erroTurnosFixos) return { erro: erroTurnosFixos };

  // Recriar as listas do zero é mais simples que casar item a item (a
  // cooperativa pode reordenar, remover do meio, editar texto e valor ao
  // mesmo tempo) — turnos/apoios já fechados guardam seu próprio snapshot
  // de descrição/valor, então não perdem nada quando a faixa/perfil de
  // origem é apagado (só o vínculo de rastreabilidade fica null).
  await prisma.$transaction([
    prisma.cliente.update({
      where: { id: clienteId },
      data: { nome, ...dadosComuns(formData) },
    }),
    prisma.clienteTaxaExtra.deleteMany({ where: { clienteId } }),
    prisma.clienteTaxaExtra.createMany({
      data: taxasExtras.map((t) => ({ ...t, clienteId })),
    }),
    prisma.clienteTurnoFixo.deleteMany({ where: { clienteId } }),
    prisma.clienteTurnoFixo.createMany({
      data: turnosFixos.map((t) => ({ ...t, clienteId })),
    }),
  ]);

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clienteId}`);
}

export async function alternarAtivoCliente(clienteId: number, ativo: boolean) {
  const sessao = await requireTenantCompleto();
  await prisma.cliente.updateMany({
    where: { id: clienteId, empresaId: sessao.empresaEfetivoId },
    data: { ativo },
  });
  revalidatePath("/clientes");
}

/** Troca o link do portal por um novo — útil se o link vazou ou se
 * precisar revogar o acesso de quem tinha o link antigo salvo. */
export async function regenerarTokenPortal(clienteId: number) {
  const sessao = await requireTenantCompleto();
  await prisma.cliente.updateMany({
    where: { id: clienteId, empresaId: sessao.empresaEfetivoId },
    data: { tokenPortal: randomBytes(16).toString("hex") },
  });
  revalidatePath(`/clientes/${clienteId}`);
}

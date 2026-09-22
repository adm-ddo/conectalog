"use client";

import { useState, useTransition } from "react";
import { encerrarTurnoManualmente } from "./actions";
import { calcularBandasGarantido } from "@/lib/taxaExtraDeficit";
import { formatarMoeda } from "@/lib/valores";

type Taxa = { itemId: number; descricao: string; valorMotoboyUnidade: number };

/** Botão de "última instância" pra cooperativa encerrar um turno que o
 * motoboy deixou aberto — só aparece (ver podeEncerrarManualmente,
 * page.tsx) depois de passados 15min do horário configurado de fim do
 * turno (ou pra qualquer turno livre, que não tem horário configurado).
 * Pede a quantidade de bandas/taxas de verdade (a cooperativa deve
 * confirmar com o motoboy antes, por telefone por exemplo) — não fecha
 * automaticamente em 0. Fica registrado pra sempre que foi ESSE usuário
 * quem encerrou na mão, não o motoboy nem o cron. */
export default function EncerrarManualForm({
  turnoId,
  turnoLabel,
  bandasIncluidas,
  valorGarantidoMotoboy,
  valorExcedenteMotoboy,
  taxas,
}: {
  turnoId: number;
  turnoLabel: string;
  bandasIncluidas: number | null;
  valorGarantidoMotoboy: number | null;
  valorExcedenteMotoboy: number | null;
  taxas: Taxa[];
}) {
  const [aberto, setAberto] = useState(false);
  const [quantidadeBandas, setQuantidadeBandas] = useState(0);
  const [quantidadeRetornos, setQuantidadeRetornos] = useState(0);
  const [taxasFinais, setTaxasFinais] = useState<Record<number, number>>(
    Object.fromEntries(taxas.map((t) => [t.itemId, 0]))
  );
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const temGarantido =
    bandasIncluidas !== null && valorGarantidoMotoboy !== null && valorExcedenteMotoboy !== null;
  // Retorno conta igual a uma banda normal pro cálculo (ver
  // Turno.quantidadeRetornos no schema) — soma antes de simular o
  // garantido, sem misturar o que é gravado separado.
  const totalBandasEquivalentes = quantidadeBandas + quantidadeRetornos;
  const { valorMotoboyBandas, excedentes } = calcularBandasGarantido(
    temGarantido ? { bandasIncluidas, valorGarantidoMotoboy, valorExcedenteMotoboy } : null,
    totalBandasEquivalentes
  );
  const taxaExtraTotal = taxas.reduce(
    (soma, t) => soma + (taxasFinais[t.itemId] ?? 0) * t.valorMotoboyUnidade,
    0
  );

  function confirmarEncerramento() {
    if (
      !window.confirm(
        `Encerrar esse turno da ${turnoLabel} manualmente com ${quantidadeBandas} banda${quantidadeBandas === 1 ? "" : "s"}? O motoboy não vai poder mais encerrar sozinho depois disso.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const resultado = await encerrarTurnoManualmente(
        turnoId,
        quantidadeBandas,
        quantidadeRetornos,
        taxas.map((t) => ({ itemId: t.itemId, quantidade: taxasFinais[t.itemId] ?? 0 })),
        observacao
      );
      setErro(resultado?.erro ?? null);
    });
  }

  if (!aberto) {
    return (
      <div className="rounded-2xl border border-red-300 bg-red-50 p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-red-800">Motoboy não encerrou o turno</h2>
          <p className="text-xs text-red-800 mt-1">
            Já passou do horário configurado de fim. Se confirmar com ele que o turno acabou, você
            pode encerrar manualmente daqui.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="rounded-lg border border-red-400 text-red-800 hover:bg-red-100 text-xs font-semibold px-4 py-2 transition-colors shrink-0"
        >
          Encerrar manualmente
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-red-300 bg-red-50 p-5 flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-red-800">
          Encerrar manualmente <span className="font-normal capitalize">— turno da {turnoLabel}</span>
        </h2>
        <p className="text-xs text-red-800 mt-1">
          Confirme com o motoboy quantas bandas ele fez antes de encerrar — isso vai valer pro
          pagamento dele.
        </p>
      </div>

      {temGarantido && (
        <div className="rounded-lg bg-white/60 border border-red-200 px-3 py-2 text-xs text-red-900 flex flex-col gap-1">
          <p>
            Garantido do turno da {turnoLabel}: até <strong>{bandasIncluidas}</strong> entregas (R${" "}
            {formatarMoeda(valorGarantidoMotoboy)}).
          </p>
          {excedentes > 0 && (
            <p>
              {totalBandasEquivalentes} entregas = <strong>R$ {formatarMoeda(valorMotoboyBandas)}</strong> (
              {excedentes} excedente{excedentes === 1 ? "" : "s"}).
            </p>
          )}
          <p className="font-semibold text-navy-900">
            Total: R$ {formatarMoeda(valorMotoboyBandas + taxaExtraTotal)}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-600">Bandas</span>
          <input
            type="number"
            min="0"
            value={quantidadeBandas}
            onChange={(e) => setQuantidadeBandas(Math.max(0, Number(e.target.value)))}
            className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm w-24"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-600">Retornos</span>
          <input
            type="number"
            min="0"
            value={quantidadeRetornos}
            onChange={(e) => setQuantidadeRetornos(Math.max(0, Number(e.target.value)))}
            className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm w-24"
          />
        </label>
        {taxas.map((t) => (
          <label key={t.itemId} className="flex flex-col gap-1">
            <span className="text-xs text-stone-600">{t.descricao}</span>
            <input
              type="number"
              min="0"
              value={taxasFinais[t.itemId] ?? 0}
              onChange={(e) =>
                setTaxasFinais((prev) => ({ ...prev, [t.itemId]: Math.max(0, Number(e.target.value)) }))
              }
              className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm w-24"
            />
          </label>
        ))}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-stone-600">Motivo do encerramento manual (opcional)</span>
        <input
          type="text"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Ex.: motoboy não respondeu, cliente confirmou 8 entregas por telefone"
          className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm"
        />
      </label>

      {erro && <p className="text-xs text-red-700 font-medium">{erro}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={confirmarEncerramento}
          className="self-start rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold px-4 py-2 disabled:opacity-50 transition-colors"
        >
          {pending ? "Encerrando..." : "Confirmar encerramento"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setAberto(false)}
          className="self-start rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-50 text-xs font-semibold px-4 py-2 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

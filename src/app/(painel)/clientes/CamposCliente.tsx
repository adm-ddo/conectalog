"use client";

import { useState } from "react";
import CampoMoeda from "@/components/CampoMoeda";
import CampoMoedaControlado from "@/components/CampoMoedaControlado";

const inputClasse =
  "border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-full";

// Índice = Date.getDay() (0=domingo...6=sábado); exibido na ordem
// segunda→domingo, que é como a cooperativa pensa a semana.
const DIAS_SEMANA: { dia: number; label: string }[] = [
  { dia: 1, label: "Seg" },
  { dia: 2, label: "Ter" },
  { dia: 3, label: "Qua" },
  { dia: 4, label: "Qui" },
  { dia: 5, label: "Sex" },
  { dia: 6, label: "Sáb" },
  { dia: 0, label: "Dom" },
];

export type ValoresCliente = {
  nome?: string;
  endereco?: string | null;
  turnoManhaAtivo?: boolean;
  turnoManhaInicio?: string | null;
  turnoManhaFim?: string | null;
  motosFixasManha?: number[];
  turnoNoiteAtivo?: boolean;
  turnoNoiteInicio?: string | null;
  turnoNoiteFim?: string | null;
  motosFixasNoite?: number[];
  valorBandaMotoboy?: number | null;
  valorBandaCliente?: number | null;
  taxasExtras?: { descricao: string; valorMotoboy: number; valorCliente: number }[];
  valorDiariaMotoboy?: number | null;
  valorDiariaCliente?: number | null;
  bandasIncluidasNaDiaria?: number | null;
  valorBandaExcedenteMotoboy?: number | null;
  valorBandaExcedenteCliente?: number | null;
};

export default function CamposCliente({ valores = {} }: { valores?: ValoresCliente }) {
  const [turnoManhaAtivo, setTurnoManhaAtivo] = useState(valores.turnoManhaAtivo ?? false);
  const [turnoNoiteAtivo, setTurnoNoiteAtivo] = useState(valores.turnoNoiteAtivo ?? false);
  const [usarDiaria, setUsarDiaria] = useState(valores.valorDiariaMotoboy != null);
  const [taxasExtras, setTaxasExtras] = useState(valores.taxasExtras ?? []);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Nome</span>
          <input name="nome" required defaultValue={valores.nome} className={inputClasse} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Endereço</span>
          <input name="endereco" defaultValue={valores.endereco ?? ""} className={inputClasse} />
        </label>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold text-stone-600 uppercase tracking-wide">
          Turnos e motos fixas contratadas por dia da semana
        </span>
        <div className="grid grid-cols-1 gap-3">
          <BlocoTurno
            titulo="Manhã"
            prefixo="Manha"
            ativo={turnoManhaAtivo}
            onAtivoChange={setTurnoManhaAtivo}
            inicioDefault={valores.turnoManhaInicio}
            fimDefault={valores.turnoManhaFim}
            motosDefault={valores.motosFixasManha}
          />
          <BlocoTurno
            titulo="Noite"
            prefixo="Noite"
            ativo={turnoNoiteAtivo}
            onAtivoChange={setTurnoNoiteAtivo}
            inicioDefault={valores.turnoNoiteInicio}
            fimDefault={valores.turnoNoiteFim}
            motosDefault={valores.motosFixasNoite}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold text-stone-600 uppercase tracking-wide">
          Preço por banda (sem herdar valor: deixe em branco)
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CampoMoeda
            name="valorBandaMotoboy"
            label="Banda — motoboy recebe"
            defaultValue={valores.valorBandaMotoboy}
            opcional
          />
          <CampoMoeda
            name="valorBandaCliente"
            label="Banda — cooperativa cobra do cliente"
            defaultValue={valores.valorBandaCliente}
            opcional
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-stone-600 uppercase tracking-wide">
            Taxas extras
          </span>
          <p className="text-xs text-stone-500">
            Cada cliente cobra taxa extra do seu jeito (por faixa de distância, por exemplo). Crie
            quantas faixas precisar e explique do que se trata cada uma — a Taxa 1 pode ser
            &quot;6,1 a 9km&quot;, a Taxa 2 &quot;9,1 a 12km&quot;, e assim por diante.
          </p>
        </div>

        <input type="hidden" name="taxaExtraCount" value={taxasExtras.length} />

        {taxasExtras.length > 0 && (
          <div className="flex flex-col gap-3">
            {taxasExtras.map((taxa, i) => (
              <div
                key={i}
                className="rounded-xl border border-stone-200 p-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3"
              >
                <label className="flex-1 flex flex-col gap-1">
                  <span className="text-xs text-stone-500">Taxa {i + 1} — especificação</span>
                  <input
                    name={`taxaExtraDescricao_${i}`}
                    value={taxa.descricao}
                    onChange={(e) => {
                      const nova = [...taxasExtras];
                      nova[i] = { ...nova[i], descricao: e.target.value };
                      setTaxasExtras(nova);
                    }}
                    placeholder="ex.: 6,1 a 9km"
                    className={inputClasse}
                  />
                </label>
                <div className="w-full sm:w-40">
                  <CampoMoedaControlado
                    label="Motoboy recebe"
                    valor={taxa.valorMotoboy}
                    onChange={(v) => {
                      const nova = [...taxasExtras];
                      nova[i] = { ...nova[i], valorMotoboy: v };
                      setTaxasExtras(nova);
                    }}
                  />
                  <input type="hidden" name={`taxaExtraValorMotoboy_${i}`} value={taxa.valorMotoboy} />
                </div>
                <div className="w-full sm:w-40">
                  <CampoMoedaControlado
                    label="Cooperativa cobra"
                    valor={taxa.valorCliente}
                    onChange={(v) => {
                      const nova = [...taxasExtras];
                      nova[i] = { ...nova[i], valorCliente: v };
                      setTaxasExtras(nova);
                    }}
                  />
                  <input type="hidden" name={`taxaExtraValorCliente_${i}`} value={taxa.valorCliente} />
                </div>
                <button
                  type="button"
                  onClick={() => setTaxasExtras(taxasExtras.filter((_, j) => j !== i))}
                  className="self-start sm:self-end text-xs text-red-600 hover:underline px-1 py-2"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() =>
            setTaxasExtras([...taxasExtras, { descricao: "", valorMotoboy: 0, valorCliente: 0 }])
          }
          className="self-start text-sm font-medium text-brand-700 hover:underline"
        >
          + Adicionar taxa {taxasExtras.length + 1}
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-stone-200 p-4">
        <label className="flex items-center gap-2 text-sm font-medium text-navy-900">
          <input
            type="checkbox"
            name="usarDiaria"
            checked={usarDiaria}
            onChange={(e) => setUsarDiaria(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
          />
          Esse cliente paga diária (moto fixa parada por dia, com franquia de bandas)
        </label>

        {usarDiaria && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CampoMoeda
              name="valorDiariaMotoboy"
              label="Diária — motoboy recebe"
              defaultValue={valores.valorDiariaMotoboy}
            />
            <CampoMoeda
              name="valorDiariaCliente"
              label="Diária — cooperativa cobra do cliente"
              defaultValue={valores.valorDiariaCliente}
            />
            <label className="flex flex-col gap-1">
              <span className="text-xs text-stone-500">Bandas incluídas na diária</span>
              <input
                name="bandasIncluidasNaDiaria"
                type="number"
                min="0"
                defaultValue={valores.bandasIncluidasNaDiaria ?? ""}
                className={inputClasse}
              />
            </label>
            <div />
            <CampoMoeda
              name="valorBandaExcedenteMotoboy"
              label="Banda excedente — motoboy recebe"
              defaultValue={valores.valorBandaExcedenteMotoboy}
            />
            <CampoMoeda
              name="valorBandaExcedenteCliente"
              label="Banda excedente — cooperativa cobra do cliente"
              defaultValue={valores.valorBandaExcedenteCliente}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function BlocoTurno({
  titulo,
  prefixo,
  ativo,
  onAtivoChange,
  inicioDefault,
  fimDefault,
  motosDefault,
}: {
  titulo: string;
  prefixo: "Manha" | "Noite";
  ativo: boolean;
  onAtivoChange: (v: boolean) => void;
  inicioDefault?: string | null;
  fimDefault?: string | null;
  motosDefault?: number[];
}) {
  return (
    <div className="rounded-xl border border-stone-200 p-3 flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm font-medium text-navy-900">
        <input
          type="checkbox"
          name={`turno${prefixo}Ativo`}
          checked={ativo}
          onChange={(e) => onAtivoChange(e.target.checked)}
          className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
        />
        Turno {titulo}
      </label>
      {ativo && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-stone-500">Início</span>
              <input
                type="time"
                name={`turno${prefixo}Inicio`}
                defaultValue={inicioDefault ?? ""}
                className={inputClasse}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-stone-500">Fim</span>
              <input
                type="time"
                name={`turno${prefixo}Fim`}
                defaultValue={fimDefault ?? ""}
                className={inputClasse}
              />
            </label>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-stone-500">Motos fixas contratadas por dia</span>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {DIAS_SEMANA.map(({ dia, label }) => (
                <label key={dia} className="flex flex-col items-center gap-1">
                  <span className="text-[11px] text-stone-500">{label}</span>
                  <input
                    type="number"
                    min="0"
                    name={`motosFixas${prefixo}${dia}`}
                    defaultValue={motosDefault?.[dia] ?? 0}
                    className={`${inputClasse} text-center px-1`}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

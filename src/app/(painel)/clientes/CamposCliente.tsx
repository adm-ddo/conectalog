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

type TurnoFixo = {
  nome: string;
  horaInicio: string;
  horaFim: string;
  diasSemana: number[];
  valorGarantidoMotoboy: number;
  valorGarantidoCliente: number;
  bandasIncluidas: number;
  valorExcedenteMotoboy: number;
  valorExcedenteCliente: number;
};

export type ValoresCliente = {
  nome?: string;
  endereco?: string | null;
  turnoManhaAtivo?: boolean;
  turnoManhaInicio?: string | null;
  turnoManhaFim?: string | null;
  motosFixasManha?: number[];
  turnoTardeAtivo?: boolean;
  turnoTardeInicio?: string | null;
  turnoTardeFim?: string | null;
  motosFixasTarde?: number[];
  turnoNoiteAtivo?: boolean;
  turnoNoiteInicio?: string | null;
  turnoNoiteFim?: string | null;
  motosFixasNoite?: number[];
  valorBandaMotoboy?: number | null;
  valorBandaCliente?: number | null;
  taxasExtras?: { descricao: string; valorMotoboy: number; valorCliente: number }[];
  turnosFixos?: TurnoFixo[];
};

export default function CamposCliente({ valores = {} }: { valores?: ValoresCliente }) {
  const [turnoManhaAtivo, setTurnoManhaAtivo] = useState(valores.turnoManhaAtivo ?? false);
  const [turnoTardeAtivo, setTurnoTardeAtivo] = useState(valores.turnoTardeAtivo ?? false);
  const [turnoNoiteAtivo, setTurnoNoiteAtivo] = useState(valores.turnoNoiteAtivo ?? false);
  const [taxasExtras, setTaxasExtras] = useState(valores.taxasExtras ?? []);
  const [turnosFixos, setTurnosFixos] = useState(valores.turnosFixos ?? []);

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
            titulo="Tarde"
            prefixo="Tarde"
            ativo={turnoTardeAtivo}
            onAtivoChange={setTurnoTardeAtivo}
            inicioDefault={valores.turnoTardeInicio}
            fimDefault={valores.turnoTardeFim}
            motosDefault={valores.motosFixasTarde}
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

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-stone-600 uppercase tracking-wide">
            Valor fixo por turno que o motoboy recebe
          </span>
          <p className="text-xs text-stone-500">
            Regra fixa, mas os valores podem mudar por perfil: um valor garantido pra até N
            entregas naquele horário, e um valor por entrega excedente depois disso. Cada perfil
            vale só nos dias da semana marcados — se domingo à noite paga diferente do resto da
            semana, crie um perfil só pra domingo.
          </p>
        </div>

        <input type="hidden" name="turnoFixoCount" value={turnosFixos.length} />

        {turnosFixos.length > 0 && (
          <div className="flex flex-col gap-3">
            {turnosFixos.map((perfil, i) => (
              <BlocoTurnoFixo
                key={i}
                indice={i}
                perfil={perfil}
                onChange={(novo) => {
                  const nova = [...turnosFixos];
                  nova[i] = novo;
                  setTurnosFixos(nova);
                }}
                onRemover={() => setTurnosFixos(turnosFixos.filter((_, j) => j !== i))}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() =>
            setTurnosFixos([
              ...turnosFixos,
              {
                nome: "",
                horaInicio: "",
                horaFim: "",
                diasSemana: [],
                valorGarantidoMotoboy: 0,
                valorGarantidoCliente: 0,
                bandasIncluidas: 0,
                valorExcedenteMotoboy: 0,
                valorExcedenteCliente: 0,
              },
            ])
          }
          className="self-start text-sm font-medium text-brand-700 hover:underline"
        >
          + Adicionar perfil de valor fixo
        </button>
      </div>
    </div>
  );
}

function BlocoTurnoFixo({
  indice,
  perfil,
  onChange,
  onRemover,
}: {
  indice: number;
  perfil: TurnoFixo;
  onChange: (novo: TurnoFixo) => void;
  onRemover: () => void;
}) {
  return (
    <div className="rounded-xl border border-stone-200 p-3 flex flex-col gap-3">
      <div className="flex items-end gap-3">
        <label className="flex-1 flex flex-col gap-1">
          <span className="text-xs text-stone-500">Nome do perfil</span>
          <input
            name={`turnoFixoNome_${indice}`}
            value={perfil.nome}
            onChange={(e) => onChange({ ...perfil, nome: e.target.value })}
            placeholder="ex.: Noite (domingo)"
            className={inputClasse}
          />
        </label>
        <button
          type="button"
          onClick={onRemover}
          className="text-xs text-red-600 hover:underline px-1 py-2 shrink-0"
        >
          Remover
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Início</span>
          <input
            type="time"
            name={`turnoFixoHoraInicio_${indice}`}
            value={perfil.horaInicio}
            onChange={(e) => onChange({ ...perfil, horaInicio: e.target.value })}
            className={inputClasse}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Fim</span>
          <input
            type="time"
            name={`turnoFixoHoraFim_${indice}`}
            value={perfil.horaFim}
            onChange={(e) => onChange({ ...perfil, horaFim: e.target.value })}
            className={inputClasse}
          />
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-stone-500">Vale nesses dias</span>
        <div className="flex flex-wrap gap-2">
          {DIAS_SEMANA.map(({ dia, label }) => {
            const marcado = perfil.diasSemana.includes(dia);
            return (
              <label key={dia} className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  name={`turnoFixoDia_${indice}_${dia}`}
                  checked={marcado}
                  onChange={(e) =>
                    onChange({
                      ...perfil,
                      diasSemana: e.target.checked
                        ? [...perfil.diasSemana, dia].sort()
                        : perfil.diasSemana.filter((d) => d !== dia),
                    })
                  }
                  className="h-3.5 w-3.5 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
                />
                {label}
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <CampoMoedaControlado
            label="Valor garantido — motoboy recebe"
            valor={perfil.valorGarantidoMotoboy}
            onChange={(v) => onChange({ ...perfil, valorGarantidoMotoboy: v })}
          />
          <input
            type="hidden"
            name={`turnoFixoValorGarantidoMotoboy_${indice}`}
            value={perfil.valorGarantidoMotoboy}
          />
        </div>
        <div>
          <CampoMoedaControlado
            label="Valor garantido — cooperativa cobra"
            valor={perfil.valorGarantidoCliente}
            onChange={(v) => onChange({ ...perfil, valorGarantidoCliente: v })}
          />
          <input
            type="hidden"
            name={`turnoFixoValorGarantidoCliente_${indice}`}
            value={perfil.valorGarantidoCliente}
          />
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Entregas incluídas no valor garantido</span>
          <input
            type="number"
            min="0"
            name={`turnoFixoBandasIncluidas_${indice}`}
            value={perfil.bandasIncluidas}
            onChange={(e) => onChange({ ...perfil, bandasIncluidas: Number(e.target.value) })}
            className={inputClasse}
          />
        </label>
        <div />
        <div>
          <CampoMoedaControlado
            label="Excedente — motoboy recebe por entrega"
            valor={perfil.valorExcedenteMotoboy}
            onChange={(v) => onChange({ ...perfil, valorExcedenteMotoboy: v })}
          />
          <input
            type="hidden"
            name={`turnoFixoValorExcedenteMotoboy_${indice}`}
            value={perfil.valorExcedenteMotoboy}
          />
        </div>
        <div>
          <CampoMoedaControlado
            label="Excedente — cooperativa cobra por entrega"
            valor={perfil.valorExcedenteCliente}
            onChange={(v) => onChange({ ...perfil, valorExcedenteCliente: v })}
          />
          <input
            type="hidden"
            name={`turnoFixoValorExcedenteCliente_${indice}`}
            value={perfil.valorExcedenteCliente}
          />
        </div>
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
  prefixo: "Manha" | "Tarde" | "Noite";
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

"use client";

import { useState } from "react";
import CampoMoeda from "@/components/CampoMoeda";

const inputClasse =
  "border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-full";

export type ValoresCliente = {
  nome?: string;
  endereco?: string | null;
  turnoManhaAtivo?: boolean;
  turnoManhaInicio?: string | null;
  turnoManhaFim?: string | null;
  motosFixasManha?: number | null;
  turnoNoiteAtivo?: boolean;
  turnoNoiteInicio?: string | null;
  turnoNoiteFim?: string | null;
  motosFixasNoite?: number | null;
  valorBandaMotoboy?: number | null;
  valorBandaCliente?: number | null;
  valorTaxaExtraMotoboy?: number | null;
  valorTaxaExtraCliente?: number | null;
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
          Turnos e motos fixas contratadas
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <CampoMoeda
            name="valorTaxaExtraMotoboy"
            label="Taxa extra — motoboy recebe"
            defaultValue={valores.valorTaxaExtraMotoboy}
            opcional
          />
          <CampoMoeda
            name="valorTaxaExtraCliente"
            label="Taxa extra — cooperativa cobra do cliente"
            defaultValue={valores.valorTaxaExtraCliente}
            opcional
          />
        </div>
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
  motosDefault?: number | null;
}) {
  return (
    <div className="rounded-xl border border-stone-200 p-3 flex flex-col gap-2">
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
          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-xs text-stone-500">Motos fixas contratadas</span>
            <input
              type="number"
              min="0"
              name={`motosFixas${prefixo}`}
              defaultValue={motosDefault ?? ""}
              className={inputClasse}
            />
          </label>
        </div>
      )}
    </div>
  );
}

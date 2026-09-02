"use client";

import { useState, useTransition } from "react";
import CameraCapture from "@/components/CameraCapture";
import SignaturePadInput from "@/components/SignaturePadInput";
import { TERMO_AUTONOMO } from "@/lib/termos";
import { iniciarTurno } from "./actions";
import type { TurnoPredefinido } from "@/generated/prisma/enums";

export default function IniciarTurnoWizard({
  clientes,
}: {
  clientes: { id: number; nome: string }[];
}) {
  const [passo, setPasso] = useState(0);
  const [clienteId, setClienteId] = useState<number | null>(clientes[0]?.id ?? null);
  const [turnoPredefinido, setTurnoPredefinido] = useState<TurnoPredefinido>("LIVRE");
  const [fotoInicioDataUrl, setFotoInicioDataUrl] = useState<string | null>(null);
  const [aceitouTermo, setAceitouTermo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const clienteSelecionado = clientes.find((c) => c.id === clienteId);

  if (clientes.length === 0) {
    return (
      <p className="text-sm text-stone-600">
        Você ainda não está liberado pra nenhum cliente. Fale com a cooperativa.
      </p>
    );
  }

  function assinar(assinaturaTermoDataUrl: string) {
    if (!clienteId || !fotoInicioDataUrl) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await iniciarTurno({
        clienteId,
        turnoPredefinido,
        fotoInicioDataUrl,
        assinaturaTermoDataUrl,
      });
      if (resultado?.erro) setErro(resultado.erro);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {passo === 0 && (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-stone-500">Onde você vai trabalhar?</span>
            <select
              value={clienteId ?? ""}
              onChange={(e) => setClienteId(Number(e.target.value))}
              className="border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-stone-500">Turno</span>
            <div className="flex gap-2">
              {(["MANHA", "TARDE", "NOITE", "LIVRE"] as const).map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  onClick={() => setTurnoPredefinido(opcao)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                    turnoPredefinido === opcao
                      ? "bg-brand-600 text-white"
                      : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {opcao === "MANHA"
                    ? "Manhã"
                    : opcao === "TARDE"
                      ? "Tarde"
                      : opcao === "NOITE"
                        ? "Noite"
                        : "Livre"}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPasso(1)}
            disabled={!clienteId}
            className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors"
          >
            Continuar
          </button>
        </div>
      )}

      {passo === 1 && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-stone-600">
            Tire uma foto agora, em {clienteSelecionado?.nome}, mostrando que você chegou.
          </p>
          {fotoInicioDataUrl ? (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- preview local de data URL */}
              <img
                src={fotoInicioDataUrl}
                alt="Chegada"
                className="w-full max-w-sm rounded-xl object-cover border border-stone-300"
              />
              <button
                type="button"
                onClick={() => setPasso(2)}
                className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-6 py-2.5 transition-colors"
              >
                Continuar
              </button>
            </div>
          ) : (
            <CameraCapture camera="user" onCapture={(dataUrl) => setFotoInicioDataUrl(dataUrl)} />
          )}
        </div>
      )}

      {passo === 2 && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 flex flex-col gap-2 text-sm text-stone-700">
            {TERMO_AUTONOMO.map((paragrafo, i) => (
              <p key={i}>{paragrafo}</p>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={aceitouTermo}
              onChange={(e) => setAceitouTermo(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
            />
            Li e concordo com os termos acima
          </label>
          {aceitouTermo && (
            <>
              <p className="text-xs text-stone-500">Assine abaixo pra confirmar o início do turno.</p>
              <SignaturePadInput onConfirm={assinar} confirmLabel="Assinar e iniciar turno" />
            </>
          )}
        </div>
      )}

      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {erro}
        </p>
      )}
      {pending && <p className="text-sm text-stone-500">Enviando...</p>}
    </div>
  );
}

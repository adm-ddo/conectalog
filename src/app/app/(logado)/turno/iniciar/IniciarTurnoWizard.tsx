"use client";

import { useState, useTransition } from "react";
import CameraCapture from "@/components/CameraCapture";
import SignaturePadInput from "@/components/SignaturePadInput";
import { TERMO_AUTONOMO } from "@/lib/termos";
import { iniciarTurno } from "./actions";
import type { TurnoPredefinido } from "@/generated/prisma/enums";

type Cliente = {
  id: number;
  nome: string;
  turnoManhaAtivo: boolean;
  turnoTardeAtivo: boolean;
  turnoNoiteAtivo: boolean;
};

// LIVRE não tem um "ativo" configurável no cadastro do cliente — é o
// turno avulso, sempre disponível como alternativa aos horários fixos
// (ver comentário do enum TurnoPredefinido no schema).
const OPCOES_TURNO: { valor: TurnoPredefinido; label: string; ativoEm?: keyof Cliente }[] = [
  { valor: "MANHA", label: "Manhã", ativoEm: "turnoManhaAtivo" },
  { valor: "TARDE", label: "Tarde", ativoEm: "turnoTardeAtivo" },
  { valor: "NOITE", label: "Noite", ativoEm: "turnoNoiteAtivo" },
  { valor: "LIVRE", label: "Livre" },
];

export default function IniciarTurnoWizard({ clientes }: { clientes: Cliente[] }) {
  const [passo, setPasso] = useState(0);
  const [clienteId, setClienteId] = useState<number | null>(clientes[0]?.id ?? null);
  const [turnoEscolhido, setTurnoEscolhido] = useState<TurnoPredefinido | null>(null);
  const [fotoInicioDataUrl, setFotoInicioDataUrl] = useState<string | null>(null);
  const [aceitouTermo, setAceitouTermo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const clienteSelecionado = clientes.find((c) => c.id === clienteId);
  const opcoesTurno = OPCOES_TURNO.filter(
    (opcao) => !opcao.ativoEm || clienteSelecionado?.[opcao.ativoEm]
  );
  // Deriva da escolha manual em vez de sincronizar com um efeito: se
  // trocou de cliente e a opção marcada não existe mais nele (ex.: veio
  // de um cliente com Noite pra um que só tem Manhã), cai sozinho pra
  // primeira opção disponível daquele cliente.
  const turnoPredefinido: TurnoPredefinido = opcoesTurno.some((o) => o.valor === turnoEscolhido)
    ? turnoEscolhido!
    : (opcoesTurno[0]?.valor ?? "LIVRE");

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
              {opcoesTurno.map((opcao) => (
                <button
                  key={opcao.valor}
                  type="button"
                  onClick={() => setTurnoEscolhido(opcao.valor)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                    turnoPredefinido === opcao.valor
                      ? "bg-brand-600 text-white"
                      : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {opcao.label}
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
            <CameraCapture
              camera="environment"
              ladoMaximoPx={640}
              onCapture={(dataUrl) => setFotoInicioDataUrl(dataUrl)}
            />
          )}
        </div>
      )}

      {passo === 2 && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 flex flex-col gap-3 text-sm text-stone-700 max-h-72 overflow-y-auto">
            {TERMO_AUTONOMO.map((secao) => (
              <div key={secao.titulo}>
                <p className="font-semibold text-navy-900">{secao.titulo}</p>
                <p>{secao.texto}</p>
              </div>
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

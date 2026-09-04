"use client";

import { useState, useTransition } from "react";
import { alternarEhGestor, alternarGestorCliente, atualizarRemuneracaoGestor } from "../actions";
import { LIMITE_GESTORES_POR_CLIENTE } from "@/lib/gestorConfig";
import type { ModoRemuneracaoGestor } from "@/generated/prisma/enums";

const inputClasse =
  "rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

export default function GestorSection({
  motoboyId,
  ehGestor,
  modoRemuneracao,
  valorEspecial,
  clientes,
}: {
  motoboyId: number;
  ehGestor: boolean;
  modoRemuneracao: ModoRemuneracaoGestor;
  valorEspecial: number | null;
  clientes: { id: number; nome: string; souGestor: boolean; totalGestores: number }[];
}) {
  const [pendingToggle, startToggle] = useTransition();
  const [pendingCliente, startCliente] = useTransition();
  const [pendingRemuneracao, startRemuneracao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [modo, setModo] = useState<ModoRemuneracaoGestor>(modoRemuneracao);
  const [valor, setValor] = useState(valorEspecial?.toString() ?? "");

  function mudarCliente(clienteId: number, marcado: boolean) {
    setErro(null);
    startCliente(async () => {
      const resultado = await alternarGestorCliente(motoboyId, clienteId, marcado);
      if (resultado?.erro) setErro(resultado.erro);
    });
  }

  function mudarModo(novoModo: ModoRemuneracaoGestor) {
    setModo(novoModo);
    startRemuneracao(() =>
      atualizarRemuneracaoGestor(motoboyId, novoModo, novoModo === "VALOR_ESPECIAL" ? Number(valor) || 0 : null)
    );
  }

  function salvarValorEspecial() {
    startRemuneracao(() => atualizarRemuneracaoGestor(motoboyId, "VALOR_ESPECIAL", Number(valor) || 0));
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-navy-900">Gestor de campo</h2>
        <p className="text-xs text-stone-500 mt-1">
          Um Gestor monta a escala e acompanha a equipe só dos clientes que ele é responsável, e
          recebe alerta quando um deles pede apoio. Ele ganha um login de painel próprio (por
          e-mail, pra definir a senha) — separado do login dele no app de motoboy.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-navy-900">
        <input
          type="checkbox"
          defaultChecked={ehGestor}
          disabled={pendingToggle}
          onChange={(e) => {
            setErro(null);
            startToggle(async () => {
              const resultado = await alternarEhGestor(motoboyId, e.target.checked);
              if (resultado?.erro) setErro(resultado.erro);
            });
          }}
          className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
        />
        É Gestor
      </label>

      {erro && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {erro}
        </p>
      )}

      {ehGestor && (
        <>
          <div className="flex flex-col gap-2">
            <span className="text-xs text-stone-500">
              Clientes responsáveis (no máximo {LIMITE_GESTORES_POR_CLIENTE} gestores por cliente)
            </span>
            {clientes.length === 0 ? (
              <p className="text-sm text-stone-500">Nenhum cliente cadastrado ainda.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {clientes.map((cliente) => {
                  const cheio = !cliente.souGestor && cliente.totalGestores >= LIMITE_GESTORES_POR_CLIENTE;
                  return (
                    <li key={cliente.id} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-stone-700">
                        {cliente.nome}{" "}
                        <span className="text-xs text-stone-400">
                          ({cliente.totalGestores}/{LIMITE_GESTORES_POR_CLIENTE} gestores)
                        </span>
                      </span>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          defaultChecked={cliente.souGestor}
                          disabled={pendingCliente || cheio}
                          onChange={(e) => mudarCliente(cliente.id, e.target.checked)}
                          className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500 disabled:opacity-40"
                        />
                        <span className="text-xs text-stone-500">Responsável</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-stone-100">
            <span className="text-xs text-stone-500">
              Como contar as bandas que ele mesmo faz (entregas dele, não da equipe)
            </span>
            <select
              value={modo}
              disabled={pendingRemuneracao}
              onChange={(e) => mudarModo(e.target.value as ModoRemuneracaoGestor)}
              className={inputClasse}
            >
              <option value="PADRAO">Tarifa padrão, igual aos outros motoboys</option>
              <option value="VALOR_ESPECIAL">Valor especial por banda</option>
              <option value="NAO_CONTABILIZA">Não conta financeiramente (só mostra a quantidade)</option>
            </select>
            {modo === "VALOR_ESPECIAL" && (
              <label className="flex flex-col gap-1 max-w-xs">
                <span className="text-xs text-stone-500">Valor por banda (R$)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={valor}
                  disabled={pendingRemuneracao}
                  onChange={(e) => setValor(e.target.value)}
                  onBlur={salvarValorEspecial}
                  className={inputClasse}
                />
              </label>
            )}
          </div>
        </>
      )}
    </div>
  );
}

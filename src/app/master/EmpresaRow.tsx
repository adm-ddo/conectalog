"use client";

import { useState, useTransition } from "react";
import {
  entrarNaEmpresa,
  renomearEmpresa,
  excluirEmpresa,
  alternarVisibilidadeEmpresa,
} from "./actions";

export default function EmpresaRow({
  empresaId,
  nome,
  criadoEm,
  totalMotoboys,
  totalClientes,
  visivelParaCadastro,
}: {
  empresaId: number;
  nome: string;
  criadoEm: string;
  totalMotoboys: number;
  totalClientes: number;
  visivelParaCadastro: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [pendingVisibilidade, startVisibilidade] = useTransition();
  const [editando, setEditando] = useState(false);
  const [novoNome, setNovoNome] = useState(nome);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [nomeDigitado, setNomeDigitado] = useState("");

  function salvarNome() {
    setErro(null);
    startTransition(async () => {
      try {
        const resultado = await renomearEmpresa(empresaId, novoNome);
        if (resultado?.erro) {
          setErro(resultado.erro);
          return;
        }
        setEditando(false);
      } catch {
        setErro("Não deu pra renomear agora — tenta de novo.");
      }
    });
  }

  function excluir() {
    setErro(null);
    startTransition(async () => {
      try {
        const resultado = await excluirEmpresa(empresaId);
        if (resultado?.erro) setErro(resultado.erro);
      } catch {
        setErro("Não deu pra excluir agora — tenta de novo.");
      }
    });
  }

  const nomeBate = nomeDigitado.trim().toLowerCase() === nome.trim().toLowerCase();

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex flex-col flex-1">
          {editando ? (
            <input
              autoFocus
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              className="text-sm font-semibold text-navy-900 border border-stone-300 rounded-lg px-2 py-1 max-w-xs"
            />
          ) : (
            <span className="text-sm font-semibold text-navy-900 truncate">{nome}</span>
          )}
          <span className="text-xs text-stone-500">
            Desde {criadoEm} · {totalMotoboys} motoboy{totalMotoboys === 1 ? "" : "s"} ·{" "}
            {totalClientes} cliente{totalClientes === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {editando ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={salvarNome}
                className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-2 disabled:opacity-50 transition-colors"
              >
                {pending ? "Salvando..." : "Salvar"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setEditando(false);
                  setNovoNome(nome);
                  setErro(null);
                }}
                className="text-xs text-stone-500 underline disabled:opacity-50"
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-semibold px-3 py-2 transition-colors"
              >
                Editar nome
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(() => entrarNaEmpresa(empresaId))}
                className="rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold px-4 py-2 disabled:opacity-50 transition-colors"
              >
                {pending ? "Entrando..." : "Entrar"}
              </button>
            </>
          )}
        </div>
      </div>

      {erro && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {erro}
        </p>
      )}

      <label className="flex items-center gap-2 text-xs text-stone-600">
        <input
          type="checkbox"
          checked={visivelParaCadastro}
          disabled={pendingVisibilidade}
          onChange={(e) =>
            startVisibilidade(() => alternarVisibilidadeEmpresa(empresaId, e.target.checked))
          }
          className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
        />
        Aparece na lista pro motoboy pedir vaga
      </label>

      {!editando &&
        (confirmandoExclusao ? (
          <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs text-red-700">
              Isso apaga <strong>{nome}</strong> e tudo dela pra sempre — clientes, motoboys,
              turnos, pagamentos, escalas. Não tem como desfazer. Digite o nome pra confirmar.
            </p>
            <input
              autoFocus
              value={nomeDigitado}
              onChange={(e) => setNomeDigitado(e.target.value)}
              placeholder={nome}
              className="text-sm border border-red-300 rounded-lg px-2 py-1.5"
            />
            {nomeDigitado.length > 0 && !nomeBate && (
              <p className="text-xs text-red-500">Ainda não bate com &quot;{nome}&quot;.</p>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pending || !nomeBate}
                onClick={excluir}
                className="rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-2 disabled:opacity-40 transition-colors"
              >
                {pending ? "Excluindo..." : "Excluir de vez"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setConfirmandoExclusao(false);
                  setNomeDigitado("");
                  setErro(null);
                }}
                className="text-xs text-stone-500 underline disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmandoExclusao(true)}
            className="text-xs text-red-600 hover:underline self-start"
          >
            Excluir cooperativa
          </button>
        ))}
    </li>
  );
}

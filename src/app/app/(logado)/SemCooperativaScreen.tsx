"use client";

import { useState, useTransition } from "react";
import { escolherCooperativaMotoboy } from "./actions";

export default function SemCooperativaScreen({
  empresas,
}: {
  empresas: { id: number; nome: string }[];
}) {
  const [empresaId, setEmpresaId] = useState<number | "">("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pedir() {
    if (!empresaId) return setErro("Escolha uma cooperativa.");
    setErro(null);
    startTransition(async () => {
      const resultado = await escolherCooperativaMotoboy(Number(empresaId));
      if (resultado?.erro) setErro(resultado.erro);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 flex flex-col gap-1">
        <span className="text-2xl">🛵</span>
        <h1 className="text-lg font-semibold text-navy-900">Você está disponível</h1>
        <p className="text-sm text-stone-600">
          Seu cadastro já está pronto. Cooperativas podem ver seu perfil e te chamar direto — ou
          você pode pedir vaga numa agora, escolhendo abaixo.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-stone-500">Pedir vaga numa cooperativa</label>
        {empresas.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhuma cooperativa cadastrada ainda.</p>
        ) : (
          <>
            <select
              value={empresaId}
              onChange={(e) => setEmpresaId(e.target.value ? Number(e.target.value) : "")}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Selecione...</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
            {erro && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {erro}
              </p>
            )}
            <button
              type="button"
              onClick={pedir}
              disabled={pending}
              className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors"
            >
              {pending ? "Enviando..." : "Pedir vaga"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

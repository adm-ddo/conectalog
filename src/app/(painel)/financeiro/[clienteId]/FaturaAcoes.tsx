"use client";

import { useState, useTransition } from "react";
import { gerarOuAtualizarFatura, enviarFatura, marcarFaturaPaga } from "../actions";

type Fatura = {
  id: number;
  status: "PENDENTE" | "ENVIADA" | "PAGA";
  enviadaEm: string | null;
  pagaEm: string | null;
  valorTotalMudou: boolean;
};

export default function FaturaAcoes({
  clienteId,
  periodoInicio,
  periodoFim,
  fatura,
  temContatoFinanceiro,
  pdfHref,
}: {
  clienteId: number;
  periodoInicio: string;
  periodoFim: string;
  fatura: Fatura | null;
  temContatoFinanceiro: boolean;
  pdfHref: string;
}) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-navy-900">Nota fiscal desse período</h2>
        {fatura && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              fatura.status === "PAGA"
                ? "bg-brand-100 text-brand-800"
                : fatura.status === "ENVIADA"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-stone-100 text-stone-600"
            }`}
          >
            {fatura.status === "PAGA" ? "Paga" : fatura.status === "ENVIADA" ? "Enviada" : "Gerada"}
          </span>
        )}
      </div>

      {fatura?.enviadaEm && <p className="text-xs text-stone-500">Enviada em {fatura.enviadaEm}.</p>}
      {fatura?.pagaEm && <p className="text-xs text-stone-500">Paga em {fatura.pagaEm}.</p>}
      {fatura?.valorTotalMudou && (
        <p className="text-xs text-amber-700">
          Os turnos desse período mudaram desde que essa fatura foi gerada — os valores acima já são
          os atuais, gere de novo pra atualizar o registro da fatura.
        </p>
      )}
      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {erro}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setErro(null);
              const resultado = await gerarOuAtualizarFatura(clienteId, periodoInicio, periodoFim);
              if (resultado?.erro) setErro(resultado.erro);
            })
          }
          className="rounded-lg border border-stone-300 hover:bg-stone-50 text-navy-900 text-sm font-medium px-4 py-2 disabled:opacity-50 transition-colors"
        >
          {fatura ? "Atualizar fatura" : "Gerar fatura"}
        </button>
        <a
          href={pdfHref}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-stone-300 hover:bg-stone-50 text-navy-900 text-sm font-medium px-4 py-2 transition-colors"
        >
          Baixar PDF
        </a>
        {fatura && fatura.status !== "PAGA" && (
          <button
            type="button"
            disabled={pending || !temContatoFinanceiro}
            title={!temContatoFinanceiro ? "Cadastre o contato financeiro do cliente primeiro" : undefined}
            onClick={() =>
              startTransition(async () => {
                setErro(null);
                const resultado = await enviarFatura(fatura.id);
                if (resultado?.erro) setErro(resultado.erro);
              })
            }
            className="rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 transition-colors"
          >
            {fatura.status === "ENVIADA" ? "Enviar de novo" : "Enviar por e-mail"}
          </button>
        )}
        {fatura && fatura.status === "ENVIADA" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => marcarFaturaPaga(fatura.id))}
            className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 transition-colors"
          >
            Marcar como paga
          </button>
        )}
      </div>
    </div>
  );
}

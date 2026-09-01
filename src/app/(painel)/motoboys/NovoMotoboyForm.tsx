"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { criarMotoboyManual } from "./actions";

export default function NovoMotoboyForm() {
  const [state, formAction, pending] = useActionState(criarMotoboyManual, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const enviandoRef = useRef(false);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (enviandoRef.current && !pending && !state?.erro) {
      formRef.current?.reset();
      setAberto(false);
    }
    enviandoRef.current = pending;
  }, [pending, state]);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="self-start rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2.5 transition-colors"
      >
        + Cadastrar motoboy manualmente
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-navy-900">Cadastrar motoboy manualmente</h2>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="text-xs text-stone-500 hover:underline"
        >
          Cancelar
        </button>
      </div>
      <p className="text-xs text-stone-500 -mt-2">
        O ideal é que o motoboy se cadastre sozinho pelo app dele (com foto e CNH). Esse cadastro
        aqui cria só os dados básicos — ele reivindica o acesso depois com o CPF e e-mail
        cadastrados aqui.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">Nome completo</label>
          <input
            name="nomeCompleto"
            required
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">CPF</label>
          <input
            name="cpf"
            required
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">Data de nascimento</label>
          <input
            name="dataNascimento"
            type="date"
            required
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">E-mail</label>
          <input
            name="email"
            type="email"
            required
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-xs text-stone-500">Endereço completo</label>
          <input
            name="endereco"
            required
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">Celular</label>
          <input
            name="telefoneCelular"
            required
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">Telefone de emergência</label>
          <input
            name="telefoneEmergencia"
            required
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">Tipo de chave PIX</label>
          <select
            name="tipoChavePix"
            required
            defaultValue=""
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="" disabled>
              Selecione
            </option>
            <option value="CPF">CPF</option>
            <option value="CNPJ">CNPJ</option>
            <option value="EMAIL">E-mail</option>
            <option value="TELEFONE">Telefone</option>
            <option value="ALEATORIA">Aleatória</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">Chave PIX</label>
          <input
            name="chavePix"
            required
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2.5 disabled:opacity-50 transition-colors"
      >
        {pending ? "Salvando..." : "Cadastrar motoboy"}
      </button>
    </form>
  );
}

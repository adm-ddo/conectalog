"use client";

import { useState, useTransition } from "react";
import CameraCapture from "@/components/CameraCapture";
import { cadastrarMotoboy, solicitarVagaMotoboy, type DadosCadastroMotoboy } from "./actions";
import type { TipoEquipamento } from "@/generated/prisma/enums";

type Origem = { tipo: "token"; tokenEmpresa: string } | { tipo: "solicitacao" };

type Dados = Omit<
  DadosCadastroMotoboy,
  "tokenEmpresa" | "fotoPerfilDataUrl" | "cnhDataUrl" | "senha" | "tipoEquipamento"
> & {
  confirmarSenha: string;
  senha: string;
  tipoEquipamento: TipoEquipamento | "";
};

const DADOS_INICIAIS: Dados = {
  nomeCompleto: "",
  dataNascimento: "",
  cpf: "",
  email: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  cep: "",
  telefoneCelular: "",
  telefoneEmergencia: "",
  chavePix: "",
  tipoChavePix: "CPF",
  tipoEquipamento: "",
  senha: "",
  confirmarSenha: "",
};

const PASSOS = ["Dados pessoais", "PIX e senha", "Sua foto", "CNH", "Equipamento", "Enviar"] as const;

// Bem acima do limite de body das Server Actions (10mb, ver next.config.ts)
// pra sobrar espaço pro base64 (~33% maior que o arquivo original) e a
// foto de perfil que vai junto na mesma chamada.
const TAMANHO_MAXIMO_CNH_BYTES = 6 * 1024 * 1024;

export default function CadastroMotoboyWizard({ origem }: { origem: Origem }) {
  const [passo, setPasso] = useState(0);
  const [dados, setDados] = useState<Dados>(DADOS_INICIAIS);
  const [fotoPerfilDataUrl, setFotoPerfilDataUrl] = useState<string | null>(null);
  const [cnhDataUrl, setCnhDataUrl] = useState<string | null>(null);
  const [cnhModo, setCnhModo] = useState<"foto" | "arquivo">("foto");
  const [erro, setErro] = useState<string | null>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroCep, setErroCep] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function campo<K extends keyof Dados>(chave: K) {
    return {
      value: dados[chave],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setDados((d) => ({ ...d, [chave]: e.target.value })),
    };
  }

  /** Busca rua/bairro/cidade pelo CEP (ViaCEP) — mesmo padrão já usado no
   * extras-app. Só dispara com os 8 dígitos completos; campos continuam
   * editáveis depois, pra corrigir se vier algo errado ou incompleto. */
  async function buscarCep(valor: string) {
    const digitos = valor.replace(/\D/g, "");
    if (digitos.length !== 8) return;

    setBuscandoCep(true);
    setErroCep(null);
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
      const resultado = await resposta.json();
      if (resultado.erro) {
        setErroCep("CEP não encontrado.");
        return;
      }
      setDados((d) => ({
        ...d,
        endereco: resultado.logradouro || d.endereco,
        bairro: resultado.bairro || d.bairro,
        cidade: resultado.localidade || d.cidade,
      }));
    } catch {
      setErroCep("Não foi possível consultar o CEP agora — preencha manualmente.");
    } finally {
      setBuscandoCep(false);
    }
  }

  function validarPasso0(): string | null {
    if (
      !dados.nomeCompleto.trim() ||
      !dados.dataNascimento ||
      dados.cpf.replace(/\D/g, "").length !== 11 ||
      !dados.email.trim() ||
      !dados.endereco.trim() ||
      !dados.telefoneCelular.trim() ||
      !dados.telefoneEmergencia.trim()
    ) {
      return "Preencha nome, CPF (11 dígitos), data de nascimento, e-mail, endereço e os dois telefones.";
    }
    return null;
  }

  function validarPasso1(): string | null {
    if (!dados.chavePix.trim()) return "Informe sua chave PIX.";
    if (dados.senha.length < 6) return "A senha precisa ter pelo menos 6 caracteres.";
    if (dados.senha !== dados.confirmarSenha) return "As senhas não coincidem.";
    return null;
  }

  function avancar() {
    setErro(null);
    if (passo === 0) {
      const msg = validarPasso0();
      if (msg) return setErro(msg);
    }
    if (passo === 1) {
      const msg = validarPasso1();
      if (msg) return setErro(msg);
    }
    if (passo === 2 && !fotoPerfilDataUrl) {
      return setErro("Tire sua foto de perfil pra continuar.");
    }
    if (passo === 3 && !cnhDataUrl) {
      return setErro("Envie a foto da CNH pra continuar.");
    }
    if (passo === 4 && !dados.tipoEquipamento) {
      return setErro("Selecione qual equipamento você usa.");
    }
    setPasso((p) => p + 1);
  }

  function voltar() {
    setErro(null);
    setPasso((p) => Math.max(0, p - 1));
  }

  function lerArquivoCnh(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (arquivo.size > TAMANHO_MAXIMO_CNH_BYTES) {
      setErro("Esse arquivo é grande demais (máx. 6MB) — tente uma foto ou um PDF menor.");
      return;
    }
    setErro(null);
    const leitor = new FileReader();
    leitor.onload = () => setCnhDataUrl(String(leitor.result));
    leitor.onerror = () => setErro("Não foi possível ler esse arquivo — tente outro.");
    leitor.readAsDataURL(arquivo);
  }

  function enviar() {
    if (!fotoPerfilDataUrl || !cnhDataUrl || !dados.tipoEquipamento) return;
    setErro(null);
    startTransition(async () => {
      const resultado =
        origem.tipo === "token"
          ? await cadastrarMotoboy({
              ...dados,
              tokenEmpresa: origem.tokenEmpresa,
              tipoEquipamento: dados.tipoEquipamento as TipoEquipamento,
              fotoPerfilDataUrl,
              cnhDataUrl,
            })
          : await solicitarVagaMotoboy({
              ...dados,
              tipoEquipamento: dados.tipoEquipamento as TipoEquipamento,
              fotoPerfilDataUrl,
              cnhDataUrl,
            });
      if (resultado?.erro) setErro(resultado.erro);
    });
  }

  return (
    <div className="flex flex-col gap-5 w-full max-w-md">
      <div className="flex items-center gap-1.5">
        {PASSOS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= passo ? "bg-brand-500" : "bg-stone-200"}`}
          />
        ))}
      </div>
      <h1 className="text-lg font-semibold text-navy-900">{PASSOS[passo]}</h1>

      {passo === 0 && (
        <div className="flex flex-col gap-3">
          <Campo label="Nome completo">
            <input {...campo("nomeCompleto")} className={inputClasse} />
          </Campo>
          <Campo label="Data de nascimento">
            <input type="date" {...campo("dataNascimento")} className={inputClasse} />
          </Campo>
          <Campo label="CPF">
            <input {...campo("cpf")} className={inputClasse} />
          </Campo>
          <Campo label="E-mail">
            <input type="email" {...campo("email")} className={inputClasse} />
          </Campo>
          <Campo label="CEP">
            <input
              {...campo("cep")}
              onBlur={(e) => buscarCep(e.target.value)}
              placeholder="00000-000"
              className={inputClasse}
            />
            {buscandoCep && <span className="text-xs text-stone-500">Buscando endereço...</span>}
            {erroCep && <span className="text-xs text-amber-600">{erroCep}</span>}
          </Campo>
          <Campo label="Endereço">
            <input {...campo("endereco")} className={inputClasse} />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Número">
              <input {...campo("numero")} className={inputClasse} />
            </Campo>
            <Campo label="Complemento">
              <input {...campo("complemento")} className={inputClasse} />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Bairro">
              <input {...campo("bairro")} className={inputClasse} />
            </Campo>
            <Campo label="Cidade">
              <input {...campo("cidade")} className={inputClasse} />
            </Campo>
          </div>
          <Campo label="Celular">
            <input {...campo("telefoneCelular")} className={inputClasse} />
          </Campo>
          <Campo label="Telefone de emergência (contato de outra pessoa)">
            <input {...campo("telefoneEmergencia")} className={inputClasse} />
          </Campo>
        </div>
      )}

      {passo === 1 && (
        <div className="flex flex-col gap-3">
          <Campo label="Tipo de chave PIX">
            <select {...campo("tipoChavePix")} className={inputClasse}>
              <option value="CPF">CPF</option>
              <option value="CNPJ">CNPJ</option>
              <option value="EMAIL">E-mail</option>
              <option value="TELEFONE">Telefone</option>
              <option value="ALEATORIA">Aleatória</option>
            </select>
          </Campo>
          <Campo label="Chave PIX (onde você recebe)">
            <input {...campo("chavePix")} className={inputClasse} />
          </Campo>
          <Campo label="Crie uma senha">
            <input type="password" {...campo("senha")} className={inputClasse} />
          </Campo>
          <Campo label="Confirme a senha">
            <input type="password" {...campo("confirmarSenha")} className={inputClasse} />
          </Campo>
        </div>
      )}

      {passo === 2 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-stone-600">
            Tire uma foto sua agora, na hora — não dá pra escolher da galeria.
          </p>
          {fotoPerfilDataUrl ? (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- preview local de data URL, nunca hospedado */}
              <img
                src={fotoPerfilDataUrl}
                alt="Sua foto"
                className="w-40 h-40 rounded-xl object-cover border border-stone-300"
              />
              <button
                type="button"
                onClick={() => setFotoPerfilDataUrl(null)}
                className="text-sm text-stone-500 underline"
              >
                Tirar de novo
              </button>
            </div>
          ) : (
            <CameraCapture camera="user" onCapture={(dataUrl) => setFotoPerfilDataUrl(dataUrl)} />
          )}
        </div>
      )}

      {passo === 3 && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCnhModo("foto")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${cnhModo === "foto" ? "bg-brand-600 text-white" : "bg-stone-100 text-stone-600"}`}
            >
              Tirar foto
            </button>
            <button
              type="button"
              onClick={() => setCnhModo("arquivo")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${cnhModo === "arquivo" ? "bg-brand-600 text-white" : "bg-stone-100 text-stone-600"}`}
            >
              Anexar arquivo
            </button>
          </div>

          {cnhDataUrl ? (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- preview local de data URL, nunca hospedado */}
              <img
                src={cnhDataUrl}
                alt="CNH"
                className="w-full max-w-sm rounded-xl object-contain border border-stone-300"
              />
              <button
                type="button"
                onClick={() => setCnhDataUrl(null)}
                className="text-sm text-stone-500 underline"
              >
                Trocar
              </button>
            </div>
          ) : cnhModo === "foto" ? (
            <CameraCapture camera="environment" onCapture={(dataUrl) => setCnhDataUrl(dataUrl)} />
          ) : (
            <input type="file" accept="image/*,.pdf" onChange={lerArquivoCnh} className="text-sm" />
          )}
        </div>
      )}

      {passo === 4 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-stone-600">
            Qual equipamento de entrega você usa? Isso aparece do seu lado em toda tela, pra
            cooperativa e pro cliente saberem se você dá conta de pizza grande.
          </p>
          <div className="grid grid-cols-1 gap-2">
            {(
              [
                ["BAG", "Bag (mochila nas costas)"],
                ["BAU_PEQUENO", "Baú pequeno"],
                ["BAU_MEDIO", "Baú médio"],
                ["BAU_GRANDE", "Baú grande (pizza 45cm)"],
              ] as const
            ).map(([valor, rotulo]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setDados((d) => ({ ...d, tipoEquipamento: valor }))}
                className={`rounded-lg px-4 py-3 text-sm font-medium text-left transition-colors ${
                  dados.tipoEquipamento === valor
                    ? "bg-brand-600 text-white"
                    : "bg-stone-100 text-stone-700"
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>
      )}

      {passo === 5 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-stone-600">
            Confere se está tudo certo e toca em enviar. A gente manda um link de confirmação pro
            seu e-mail — só entra no app depois de clicar nele.
            {origem.tipo === "solicitacao" &&
              " Depois de entrar, você escolhe pra qual cooperativa quer trabalhar (ou fica disponível pra elas te chamarem)."}
          </p>
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm flex flex-col gap-1">
            <p>
              <strong>{dados.nomeCompleto}</strong>
            </p>
            <p>{dados.email}</p>
            <p>{dados.telefoneCelular}</p>
            <p>
              PIX: {dados.chavePix} ({dados.tipoChavePix})
            </p>
          </div>
        </div>
      )}

      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {erro}
        </p>
      )}

      <div className="flex gap-3">
        {passo > 0 && (
          <button
            type="button"
            onClick={voltar}
            disabled={pending}
            className="rounded-lg border border-stone-300 text-sm px-5 py-2.5 text-stone-700 disabled:opacity-50"
          >
            Voltar
          </button>
        )}
        {passo < PASSOS.length - 1 ? (
          <button
            type="button"
            onClick={avancar}
            className="flex-1 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 transition-colors"
          >
            Continuar
          </button>
        ) : (
          <button
            type="button"
            onClick={enviar}
            disabled={pending}
            className="flex-1 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors"
          >
            {pending ? "Enviando..." : "Concluir cadastro"}
          </button>
        )}
      </div>
    </div>
  );
}

const inputClasse =
  "border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-full";

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-stone-500">{label}</span>
      {children}
    </label>
  );
}

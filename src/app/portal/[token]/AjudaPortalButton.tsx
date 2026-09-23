"use client";

import { useEffect, useState } from "react";

type Topico = { titulo: string; texto: string };

const TOPICOS: Topico[] = [
  {
    titulo: "🟢 Bolinha verde = moto presente",
    texto:
      "Cada motoboy escalado aparece num card. Bolinha cinza é quem ainda não chegou; bolinha verde é quem já bateu o início do turno aqui — não precisa fazer nada até ele terminar.",
  },
  {
    titulo: "✍️ Quando o motoboy for embora: encerrar e avaliar",
    texto:
      "Assim que ele terminar, clique em \"Encerrar e avaliar\" no card dele. Informe quantas entregas ele fez (do seu jeito, contando o que você viu), dê uma nota de 1 a 5 e, se rolou algum problema (pedido errado, cobrança não feita), marque a ocorrência — isso já desconta do motoboy automaticamente.",
  },
  {
    titulo: "🚩 Ele nunca apareceu de verdade? Marque isso",
    texto:
      "Se um motoboy bateu o início do turno pelo celular mas nunca esteve de fato aqui na loja, não deixe só \"0 entregas\" — na tela de encerrar, marque a opção \"Ele nunca esteve presente aqui hoje\". Isso avisa a cooperativa de forma clara que não foi só uma entrega a menos, foi ausência total.",
  },
  {
    titulo: "🍔 Quando chamar o iFood",
    texto:
      "Se faltar moto — porque a cooperativa não mandou o suficiente ou porque ninguém chegou até 30 minutos depois do horário do turno — aparece o botão \"Faltou moto — registrar chamado iFood\" dentro do turno (Manhã/Tarde/Noite). Use pra não perder o pedido: registre o número do pedido no Saipos, o número no iFood e o valor cobrado. A diferença é descontada automaticamente da fatura que a cooperativa cobra de você.",
  },
  {
    titulo: "🆘 Pedir apoio",
    texto:
      "Deu um pico de pedidos e as motos que já estão aqui não dão conta? Clique em \"Pedir apoio\" no topo da tela e informe quantas motos a mais você precisa. A cooperativa vê o pedido na hora e manda alguém disponível, se tiver.",
  },
  {
    titulo: "📅 Outros dias",
    texto:
      "Quer conferir o que aconteceu ontem ou em outro dia (o que cada motoboy disse que fez x o que você confirmou)? Use o botão \"Outros dias\" no topo da tela.",
  },
];

/** Ajuda objetiva pra quem opera o portal (dono/gerente da expedição do
 * restaurante) — pedido do Thiago: o dia a dia real de quem usa essa
 * tela é só isso (ver quem chegou, encerrar, chamar iFood, pedir apoio),
 * então não faz sentido mandar essa pessoa pro /manual (que é a
 * apresentação completa do produto pras 3 pontas). Fica só dentro do
 * portal, sem navegar pra outra página, pra não perder a tela com dados
 * ao vivo. */
export default function AjudaPortalButton() {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-lg border border-stone-300 text-stone-600 hover:border-brand-300 text-xs font-semibold px-3 py-1.5 transition-colors shrink-0"
      >
        ❓ Como usar
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setAberto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Como usar o painel de expedição"
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto flex flex-col"
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-stone-200 sticky top-0 bg-white">
              <h2 className="text-base font-semibold text-navy-900">Como usar essa tela</h2>
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar"
                className="text-stone-400 hover:text-stone-600 text-xl leading-none px-1"
              >
                ×
              </button>
            </div>
            <div className="flex flex-col gap-4 px-5 py-4">
              {TOPICOS.map((t) => (
                <div key={t.titulo} className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold text-navy-900">{t.titulo}</h3>
                  <p className="text-sm text-stone-600">{t.texto}</p>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-stone-200 sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

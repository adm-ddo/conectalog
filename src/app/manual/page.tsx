import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manual do ConectaLog",
  description:
    "Entenda o que é o ConectaLog e o que motoboy, cooperativa e empresa cliente precisam fazer.",
};

export default function ManualPage() {
  return (
    <main className="flex-1 bg-white text-navy-900">
      {/* Header simples, só a marca + voltar */}
      <header className="border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-black text-lg tracking-tight text-navy-900">
            Conecta<span className="text-brand-600">Log</span>
          </Link>
          <span className="text-xs text-stone-500 hidden sm:block">Manual de uso</span>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-navy-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 flex flex-col items-center text-center gap-6">
          <span className="text-xs font-semibold tracking-widest uppercase text-brand-400">
            Manual do ConectaLog
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight max-w-3xl">
            Um app, três frentes: controle, transparência e tranquilidade.
          </h1>
          <p className="text-navy-200 text-base sm:text-lg max-w-2xl">
            O ConectaLog é o sistema que organiza a entrega de uma cooperativa de motoboys: quem
            trabalha onde, quanto cada um fez, quanto recebe e quanto a empresa cliente paga —
            tudo com foto, assinatura e registro automático, sem planilha e sem “ele disse, ela
            disse”.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href="#cooperativa"
              className="rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 px-5 py-3 text-sm font-semibold transition-colors"
            >
              🏢 Sou a cooperativa
            </a>
            <a
              href="#motoboy"
              className="rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 px-5 py-3 text-sm font-semibold transition-colors"
            >
              🏍️ Sou motoboy
            </a>
            <a
              href="#empresa"
              className="rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 px-5 py-3 text-sm font-semibold transition-colors"
            >
              🍔 Sou a empresa cliente
            </a>
          </div>
        </div>
      </section>

      {/* As 3 frentes, resumo visual */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-navy-900">O que exatamente é o ConectaLog</h2>
          <p className="text-stone-600 mt-3 max-w-2xl mx-auto">
            Uma cooperativa de motoboys presta entrega pra várias empresas (restaurantes, mercados,
            etc). O ConectaLog é o sistema que essa cooperativa usa pra organizar tudo isso — e
            cada um dos três lados envolvidos usa uma parte diferente dele.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-stone-200 p-6 flex flex-col gap-3">
            <span className="text-4xl">🏢</span>
            <h3 className="text-lg font-bold text-navy-900">Controle pra cooperativa</h3>
            <p className="text-sm text-stone-600">
              Vê em tempo real quem está trabalhando, em qual cliente, monta a escala com
              antecedência, resolve divergências e fecha o pagamento de cada motoboy sem planilha.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200 p-6 flex flex-col gap-3">
            <span className="text-4xl">🏍️</span>
            <h3 className="text-lg font-bold text-navy-900">Transparência pro motoboy</h3>
            <p className="text-sm text-stone-600">
              Sabe exatamente quanto vai receber, vê sua nota de avaliação, sua escala dos próximos
              dias e tem prova (foto + assinatura) de cada turno que fez.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200 p-6 flex flex-col gap-3">
            <span className="text-4xl">🍔</span>
            <h3 className="text-lg font-bold text-navy-900">Tranquilidade pra empresa</h3>
            <p className="text-sm text-stone-600">
              Sabe quem está entregando pra ela agora, confirma a quantidade de entregas do próprio
              lado e nunca precisa negociar valor direto com o motoboy.
            </p>
          </div>
        </div>
      </section>

      {/* Fluxo do dia a dia */}
      <section className="bg-stone-50 border-y border-stone-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-navy-900 text-center mb-12">
            Como funciona um turno, do início ao fim
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {[
              { emoji: "📸", titulo: "1. Motoboy chega", texto: "Tira uma foto no local e assina o termo do dia, direto pelo celular." },
              { emoji: "🛵", titulo: "2. Trabalha", texto: "Faz as entregas (bandas) e pode ajudar outro cliente da cooperativa, se precisar." },
              { emoji: "✍️", titulo: "3. Encerra o turno", texto: "Informa quantas entregas fez, tira outra foto, assina o recibo e avalia a empresa." },
              { emoji: "✅", titulo: "4. Empresa confirma", texto: "O restaurante confirma quantas entregas viu acontecer e avalia o motoboy." },
              { emoji: "💰", titulo: "5. Cooperativa fecha", texto: "Cobra da empresa, paga o motoboy — com qualquer vale ou desconto já descontado." },
            ].map((passo) => (
              <div key={passo.titulo} className="rounded-2xl bg-white border border-stone-200 p-5 flex flex-col gap-2">
                <span className="text-3xl">{passo.emoji}</span>
                <h3 className="text-sm font-bold text-navy-900">{passo.titulo}</h3>
                <p className="text-xs text-stone-600">{passo.texto}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-stone-500 mt-8">
            Se o número de entregas que o motoboy informou for diferente do que a empresa
            confirmou, a cooperativa entra em acordo com os dois lados antes de fechar o pagamento
            — nada é decidido sozinho.
          </p>
        </div>
      </section>

      {/* COOPERATIVA */}
      <section id="cooperativa" className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 scroll-mt-16">
        <div className="flex flex-col sm:flex-row gap-8 items-start">
          <div className="shrink-0 h-16 w-16 rounded-2xl bg-navy-900 text-white flex items-center justify-center text-3xl">
            🏢
          </div>
          <div className="flex-1 flex flex-col gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-navy-900">Pra cooperativa: controle total da operação</h2>
            <p className="text-stone-600">
              O painel do ConectaLog é onde a cooperativa cadastra as empresas clientes e os
              motoboys, organiza quem trabalha onde, acompanha tudo em tempo real e fecha os
              pagamentos — tudo pelo navegador, no computador ou no celular.
            </p>
            <ul className="flex flex-col gap-3 mt-2">
              {[
                ["Cadastrar clientes", "Cada empresa atendida (restaurante, mercado etc), com o valor da banda, taxas extras e quantas motos cada turno precisa."],
                ["Cadastrar e liberar motoboys", "Aprova o cadastro que o motoboy faz pelo próprio celular e libera em quais clientes ele pode trabalhar."],
                ["Montar a escala", "Escolhe quem trabalha em qual cliente, dia e turno — com até 7 dias de antecedência, já vendo quantas motos faltam."],
                ["Acompanhar o dashboard", "Vê quem está em turno agora, equipe incompleta, solicitações de apoio e qualquer divergência pra resolver."],
                ["Fechar pagamentos", "Agrupa os turnos do período, já descontando vale, ocorrência ou atraso, e marca como pago depois do PIX."],
                ["Tirar relatórios", "Por cliente e período: quanto cobrar, quantas motos trabalharam, quanto cada uma recebe — com PDF pra enviar."],
              ].map(([titulo, texto]) => (
                <li key={titulo} className="flex gap-3">
                  <span className="text-brand-600 font-bold shrink-0">✓</span>
                  <span className="text-sm text-stone-700">
                    <strong className="text-navy-900">{titulo}.</strong> {texto}
                  </span>
                </li>
              ))}
            </ul>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-block rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-semibold px-6 py-3 text-sm transition-colors"
              >
                Entrar no painel da cooperativa →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* MOTOBOY */}
      <section id="motoboy" className="bg-brand-50/60 border-y border-stone-200 scroll-mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="flex flex-col sm:flex-row gap-8 items-start">
            <div className="shrink-0 h-16 w-16 rounded-2xl bg-brand-600 text-white flex items-center justify-center text-3xl">
              🏍️
            </div>
            <div className="flex-1 flex flex-col gap-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-navy-900">Pro motoboy: tudo pelo celular, sem enrolação</h2>
              <p className="text-stone-600">
                O app do motoboy funciona direto no navegador do celular, sem precisar instalar
                nada. É onde ele bate o início e o fim de cada turno, vê sua escala e acompanha
                quanto vai receber.
              </p>
              <ul className="flex flex-col gap-3 mt-2">
                {[
                  ["Se cadastrar", "Pelo link que a cooperativa manda: nome, CPF, chave PIX, foto de perfil e CNH (foto ou arquivo)."],
                  ["Ver a escala", "A aba \"Escala\" mostra em quais clientes e turnos ele já está confirmado pros próximos 7 dias."],
                  ["Iniciar o turno", "Chegou no cliente: tira uma foto na hora e assina o termo do dia — leva poucos segundos."],
                  ["Pedir apoio", "Se sobrar tempo, pode ajudar outro cliente da cooperativa durante o mesmo turno."],
                  ["Encerrar o turno", "Informa quantas entregas fez, tira outra foto, assina o recibo e avalia como foi o atendimento da empresa."],
                  ["Ver relatório e nota", "Acompanha quanto já fez, quanto vai receber, qualquer vale descontado e sua média de avaliação (sem ver quem avaliou)."],
                ].map(([titulo, texto]) => (
                  <li key={titulo} className="flex gap-3">
                    <span className="text-brand-600 font-bold shrink-0">✓</span>
                    <span className="text-sm text-stone-700">
                      <strong className="text-navy-900">{titulo}.</strong> {texto}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="pt-2">
                <Link
                  href="/app/entrar"
                  className="inline-block rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 text-sm transition-colors"
                >
                  Entrar no app do motoboy →
                </Link>
              </div>
              <p className="text-xs text-stone-500">
                Ainda não tem cadastro? Peça o link de cadastro pra sua cooperativa.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* EMPRESA */}
      <section id="empresa" className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 scroll-mt-16">
        <div className="flex flex-col sm:flex-row gap-8 items-start">
          <div className="shrink-0 h-16 w-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-3xl">
            🍔
          </div>
          <div className="flex-1 flex flex-col gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-navy-900">Pra empresa cliente: sem login, sem complicação</h2>
            <p className="text-stone-600">
              Se você é dono ou gerente de um restaurante (ou qualquer empresa) atendido pela
              cooperativa, você não precisa criar conta nem instalar nada — a cooperativa te manda
              um link próprio, sempre o mesmo, que abre direto o seu portal.
            </p>
            <ul className="flex flex-col gap-3 mt-2">
              {[
                ["Ver quem está trabalhando agora", "O portal mostra os motoboys que bateram o início do turno na sua loja, em tempo real."],
                ["Conferir se a equipe está completa", "Sabe na hora se falta motoboy pro turno de agora, sem precisar ligar pra cooperativa."],
                ["Confirmar as entregas", "Quando o motoboy for embora, você confirma quantas entregas (bandas) ele fez do seu lado."],
                ["Avaliar o motoboy", "Dá uma nota de 1 a 5 e pode registrar um comentário — inclusive se algo deu errado, com desconto."],
                ["Pedir apoio", "Se precisar de mais um motoboy num pico de pedidos, pode solicitar direto pelo portal."],
              ].map(([titulo, texto]) => (
                <li key={titulo} className="flex gap-3">
                  <span className="text-brand-600 font-bold shrink-0">✓</span>
                  <span className="text-sm text-stone-700">
                    <strong className="text-navy-900">{titulo}.</strong> {texto}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-stone-600 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 mt-2">
              📎 O acesso é por um link único enviado pela sua cooperativa — não existe login ou
              senha pra empresa cliente. Se você perdeu o link, peça de novo pra cooperativa que te
              atende.
            </p>
          </div>
        </div>
      </section>

      {/* Perguntas frequentes */}
      <section className="bg-stone-50 border-t border-stone-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-navy-900 text-center mb-10">
            Perguntas frequentes
          </h2>
          <div className="flex flex-col gap-5">
            {[
              ["O que é uma \"banda\"?", "É o nome usado pra cada entrega/corrida que o motoboy faz. O pagamento dele é calculado pela quantidade de bandas feitas no turno."],
              ["O motoboy tem carteira assinada?", "Não — é um prestador de serviço autônomo, sem vínculo empregatício. Isso fica claro no termo que ele assina a cada turno."],
              ["E se motoboy e empresa informarem números diferentes?", "A cooperativa vê essa divergência no painel dela e entra em acordo com os dois lados antes de fechar o pagamento — fica registrado quem resolveu e como."],
              ["Como o motoboy recebe o pagamento?", "A cooperativa faz o PIX diretamente pra ele (diário ou semanal, como for combinado) e marca no sistema como pago."],
              ["Preciso instalar algum aplicativo?", "Não. Tanto o painel da cooperativa quanto o app do motoboy e o portal da empresa funcionam direto no navegador do celular ou computador."],
            ].map(([pergunta, resposta]) => (
              <div key={pergunta} className="rounded-2xl bg-white border border-stone-200 p-5">
                <h3 className="text-sm font-bold text-navy-900 mb-1.5">{pergunta}</h3>
                <p className="text-sm text-stone-600">{resposta}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy-900 text-navy-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-black text-white tracking-tight">
            Conecta<span className="text-brand-400">Log</span>
          </span>
          <p className="text-xs text-center sm:text-right">
            Gestão de motoboys para cooperativas de entrega.
          </p>
        </div>
      </footer>
    </main>
  );
}

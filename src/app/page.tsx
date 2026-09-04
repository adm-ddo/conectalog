import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessaoEmpresa } from "@/lib/auth-empresa";
import { getSessaoMotoboy } from "@/lib/auth-motoboy";
import ContatoComercialForm from "./ContatoComercialForm";

export default async function HomePage() {
  const [sessaoEmpresa, sessaoMotoboy] = await Promise.all([
    getSessaoEmpresa(),
    getSessaoMotoboy(),
  ]);

  if (sessaoEmpresa) redirect("/dashboard");
  if (sessaoMotoboy) redirect("/app/inicio");

  return (
    <main className="flex-1 bg-white text-navy-900">
      {/* Header */}
      <header className="bg-navy-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-y-2 gap-x-3">
          <span className="font-black text-lg tracking-tight text-white shrink-0">
            Conecta<span className="text-brand-400">Log</span>
          </span>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/app/entrar"
              className="rounded-lg px-2.5 py-2 text-xs sm:text-sm font-semibold text-navy-200 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap"
            >
              🏍️ Login motoboy
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 px-2.5 py-2 text-xs sm:text-sm font-semibold text-white transition-colors whitespace-nowrap"
            >
              🏢 Login cooperativa
            </Link>
          </div>
        </div>
      </header>

      {/* Hero comercial */}
      <section className="bg-navy-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-6">
            <span className="text-xs font-semibold tracking-widest uppercase text-brand-400">
              Sistema de gestão pra cooperativas de motoboy
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Chega de planilha, grupo de WhatsApp e disputa de banda.
            </h1>
            <p className="text-navy-200 text-base sm:text-lg">
              O ConectaLog organiza a operação inteira da sua cooperativa: quem trabalha onde,
              foto e assinatura de cada turno, pagamento certo pra cada motoboy e um portal
              próprio pra cada empresa cliente acompanhar. Tudo automático, tudo registrado.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="#contato"
                className="rounded-xl bg-brand-500 hover:bg-brand-600 text-navy-900 font-bold px-6 py-3.5 text-sm sm:text-base transition-colors"
              >
                Quero usar na minha cooperativa →
              </a>
              <Link
                href="/manual"
                className="rounded-xl border border-white/25 hover:bg-white/10 text-white font-semibold px-6 py-3.5 text-sm sm:text-base transition-colors"
              >
                Ver como funciona
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
            {[
              ["🏢", "Controle", "pra cooperativa acompanhar tudo em tempo real"],
              ["🏍️", "Transparência", "pro motoboy saber exatamente quanto vai receber"],
              ["🍔", "Tranquilidade", "pra empresa cliente confiar sem precisar ligar"],
            ].map(([emoji, titulo, texto]) => (
              <div key={titulo} className="rounded-2xl bg-white/5 border border-white/10 p-5 flex items-center gap-4">
                <span className="text-3xl shrink-0">{emoji}</span>
                <div>
                  <p className="font-bold text-white">{titulo}</p>
                  <p className="text-xs text-navy-300">{texto}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dores que resolve */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-navy-900">
            Se sua cooperativa passa por isso, o ConectaLog resolve
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            ["😤", "\"Ele disse que fez 10 entregas, o cliente diz que foram 6\"", "Foto, assinatura e confirmação dos dois lados em todo turno — e se não bater, fica registrado até vocês combinarem o número certo."],
            ["📋", "\"Fecho pagamento numa planilha manual toda semana\"", "O sistema agrupa os turnos, já desconta vale e ocorrência sozinho, e você só confere e marca como pago."],
            ["📵", "\"Não sei quem está trabalhando em cada cliente agora\"", "Dashboard ao vivo: quem está em turno, em qual empresa, desde que horas — e um alerta se faltar moto."],
            ["🗓️", "\"Escalar a semana toda é um parto\"", "Monta a escala de até 7 dias de uma vez, já vendo quantas motos cada cliente precisa por dia."],
            ["💸", "\"Motoboy reclama que não sabe quanto vai receber\"", "Ele acompanha tudo pelo celular: bandas feitas, valor, vale descontado e sua própria nota de avaliação."],
            ["📞", "\"Cliente liga toda hora perguntando se tem motoboy lá\"", "Cada empresa atendida tem um portal próprio, sem senha, só um link — vê tudo sozinha, na hora."],
          ].map(([emoji, dor, solucao]) => (
            <div key={dor} className="rounded-2xl border border-stone-200 p-6 flex flex-col gap-3">
              <span className="text-3xl">{emoji}</span>
              <p className="text-sm font-semibold text-navy-900">{dor}</p>
              <p className="text-sm text-stone-600">{solucao}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona - resumo rápido */}
      <section className="bg-stone-50 border-y border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 flex flex-col items-center text-center gap-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-navy-900 max-w-2xl">
            Um sistema, três públicos — cada um usando só a parte dele
          </h2>
          <p className="text-stone-600 max-w-2xl">
            O painel da cooperativa, o app do motoboy (direto no navegador, sem instalar nada) e o
            portal da empresa cliente (sem login, só um link) conversam entre si o tempo todo.
          </p>
          <Link
            href="/manual"
            className="rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-semibold px-6 py-3 text-sm transition-colors"
          >
            Ver o manual completo de uso →
          </Link>
        </div>
      </section>

      {/* Contato / lead */}
      <section id="contato" className="bg-navy-900 text-white scroll-mt-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
              Quer colocar sua cooperativa pra rodar assim?
            </h2>
            <p className="text-navy-200">
              Deixa seu contato que a gente te chama pra mostrar o sistema funcionando de verdade
              e conversar sobre como implementar na sua operação — sem compromisso.
            </p>
            <ul className="flex flex-col gap-2 mt-2 text-sm text-navy-200">
              <li>✓ Demonstração com dados reais</li>
              <li>✓ Suporte na implantação</li>
              <li>✓ Sem fidelidade, sem letra miúda</li>
            </ul>
          </div>
          <ContatoComercialForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-black text-navy-900 tracking-tight">
            Conecta<span className="text-brand-600">Log</span>
          </span>
          <div className="flex items-center gap-5 text-xs text-stone-500">
            <Link href="/manual" className="hover:text-navy-900 hover:underline">
              Manual de uso
            </Link>
            <Link href="/app/entrar" className="hover:text-navy-900 hover:underline">
              Login motoboy
            </Link>
            <Link href="/login" className="hover:text-navy-900 hover:underline">
              Login cooperativa
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

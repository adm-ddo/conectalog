import RecuperarSenhaForm from "./RecuperarSenhaForm";

export default function RecuperarSenhaPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-16 bg-navy-900">
      <span className="text-3xl font-black tracking-tight text-white">
        Conecta<span className="text-brand-400">Log</span>
      </span>
      <RecuperarSenhaForm />
    </main>
  );
}

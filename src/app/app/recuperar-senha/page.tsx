import RecuperarSenhaMotoboyForm from "./RecuperarSenhaMotoboyForm";

export default function RecuperarSenhaMotoboyPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-10 bg-stone-50">
      <span className="text-2xl font-black tracking-tight text-navy-900">
        Conecta<span className="text-brand-600">Log</span>
      </span>
      <RecuperarSenhaMotoboyForm />
    </main>
  );
}

/** Ícone do WhatsApp linkando pro número em wa.me — abre o WhatsApp (app
 * ou Web) já com a conversa aberta. Fica ao lado do número em texto
 * normal, que continua selecionável/copiável separado do link. */
export default function WhatsAppLink({ telefone }: { telefone: string }) {
  const digitos = telefone.replace(/\D/g, "");
  if (!digitos) return null;
  // Já vem com DDD (ex.: 51999999999) — só falta o código do Brasil.
  const href = `https://wa.me/55${digitos}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Chamar ${telefone} no WhatsApp`}
      title="Abrir no WhatsApp"
      className="inline-flex items-center shrink-0"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#25D366]" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12.05 2C6.554 2 2.1 6.454 2.1 11.95c0 1.943.542 3.833 1.567 5.464L2 22l4.72-1.605a9.918 9.918 0 0 0 5.33 1.552h.004c5.494 0 9.947-4.454 9.947-9.95C22 6.499 17.548 2.046 12.05 2zm0 18.11h-.004a8.19 8.19 0 0 1-4.174-1.145l-.3-.178-3.107 1.058 1.077-3.06-.196-.313a8.194 8.194 0 0 1-1.256-4.395c0-4.532 3.688-8.22 8.223-8.22 2.197 0 4.263.856 5.816 2.41a8.166 8.166 0 0 1 2.406 5.815c0 4.533-3.687 8.22-8.223 8.22z" />
      </svg>
    </a>
  );
}

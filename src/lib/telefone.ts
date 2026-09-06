/** Formata um telefone brasileiro como "(DDD) NNNNN-NNNN" (celular, 9
 * dígitos depois do DDD) ou "(DDD) NNNN-NNNN" (fixo, 8 dígitos) —
 * usado tanto pra mascarar campo em tempo real (mascaraTelefone) quanto
 * pra normalizar na exibição um número que já está salvo em qualquer
 * formato antigo (formatarTelefone), já que motoboys cadastrados antes
 * dessa padronização guardaram o texto do jeito que digitaram. */
function paraTelefoneFormatado(digitosBrutos: string, limiteDigitos: number): string {
  const digitos = digitosBrutos.slice(0, limiteDigitos);
  if (digitos.length === 0) return "";
  if (digitos.length <= 2) return `(${digitos}`;

  const ddd = digitos.slice(0, 2);
  const numero = digitos.slice(2);
  if (numero.length <= 4) return `(${ddd}) ${numero}`;

  // Celular tem 9 dígitos depois do DDD (5+4); fixo tem 8 (4+4). Ainda
  // digitando, usa o total até agora pra decidir onde cai o traço —
  // ajusta sozinho se a pessoa continuar digitando até completar 11.
  const tamanhoPrimeiraParte = digitos.length > 10 ? 5 : 4;
  return `(${ddd}) ${numero.slice(0, tamanhoPrimeiraParte)}-${numero.slice(tamanhoPrimeiraParte)}`;
}

/** Pra usar no onChange de um campo controlado — recebe o valor bruto do
 * input (que já pode ter parênteses/traço da digitação anterior) e
 * devolve só dígitos, remascarados. Limita a 11 dígitos (DDD + celular). */
export function mascaraTelefone(valor: string): string {
  return paraTelefoneFormatado(valor.replace(/\D/g, ""), 11);
}

/** Normaliza um telefone já salvo (em qualquer formato antigo) pra
 * exibição — "51999999999", "51 99999-9999", "+55 (51) 99999-9999" etc.
 * todos viram "(51) 99999-9999". Números incompletos (menos de 10
 * dígitos, sem DDD completo) voltam como vieram, sem tentar adivinhar —
 * melhor mostrar o dado estranho do que inventar um DDD errado. */
export function formatarTelefone(valor: string | null | undefined): string {
  if (!valor) return "";
  let digitos = valor.replace(/\D/g, "");
  // "+55" ou "0055" na frente de um número de 12-13 dígitos — remove o
  // código do país antes de formatar.
  if (digitos.length > 11 && digitos.startsWith("55")) {
    digitos = digitos.slice(digitos.length - 11);
  }
  if (digitos.length < 10) return valor;
  return paraTelefoneFormatado(digitos, 11);
}

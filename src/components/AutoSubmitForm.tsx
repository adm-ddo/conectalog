"use client";

import type { FormHTMLAttributes } from "react";

/** Reenvia o form (GET, recarrega a página com os novos searchParams)
 * assim que qualquer campo dentro muda — troca um filtro (data, turno,
 * cliente...) e a tela já atualiza sozinha, sem precisar clicar num
 * botão "Ver" toda vez. O botão de submit continua funcionando (fallback
 * pra quem prefere/precisa confirmar manualmente). */
export default function AutoSubmitForm(props: FormHTMLAttributes<HTMLFormElement>) {
  return <form {...props} onChange={(e) => e.currentTarget.requestSubmit()} />;
}

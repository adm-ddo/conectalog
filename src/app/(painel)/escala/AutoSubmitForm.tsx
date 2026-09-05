"use client";

import type { FormHTMLAttributes } from "react";

/** Reenvia o form (GET, recarrega a página com os novos searchParams)
 * assim que qualquer campo dentro muda — o gestor troca a data (ou o
 * turno, ou o cliente) e a tela já atualiza sozinha com as contagens do
 * novo dia, sem precisar clicar em "Ver" toda vez que for montando a
 * escala dia a dia. O botão "Ver" continua funcionando (fallback pra
 * quem prefere/precisa confirmar manualmente). */
export default function AutoSubmitForm(props: FormHTMLAttributes<HTMLFormElement>) {
  return <form {...props} onChange={(e) => e.currentTarget.requestSubmit()} />;
}

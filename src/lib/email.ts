import "server-only";
import { Resend } from "resend";

const SITE_URL = "https://conectalog.app.br";
const REMETENTE = "ConectaLog <contato@conectalog.app.br>";

/** Sem RESEND_API_KEY configurada, o envio vira um no-op que só loga —
 * mesmo espírito do extras-app: falha de envio é resultado de negócio,
 * não motivo pra derrubar quem chamou. Quem chama sempre recebe
 * `{ sucesso: false }` em vez de uma exceção. */
function cliente(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Layout base dos e-mails transacionais — tabela + estilo inline
 * (cliente de e-mail não confia em CSS externo), fonte de fallback do
 * sistema em vez da Urbanist do resto da marca. Mesmas cores oficiais
 * do extras-app: verde #00C896, navy #0D1B2A. */
function layoutEmail({
  titulo,
  paragrafos,
  textoBotao,
  linkBotao,
}: {
  titulo: string;
  paragrafos: string[];
  textoBotao: string;
  linkBotao: string;
}): string {
  const corpoParagrafos = paragrafos
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3D4952;">${p}</p>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#F3F5F7;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F5F7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:#0D1B2A;padding:28px 32px;" align="left">
              <span style="font-size:20px;font-weight:900;color:#FFFFFF;letter-spacing:-.01em;">Conecta<span style="color:#00C896;">Log</span></span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px;">
              <h1 style="margin:0 0 16px;font-size:21px;font-weight:900;color:#14171A;letter-spacing:-.01em;">${titulo}</h1>
              ${corpoParagrafos}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:99px;background:#00C896;">
                    <a href="${linkBotao}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:800;color:#0D1B2A;text-decoration:none;">${textoBotao}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:12.5px;line-height:1.6;color:#8A93A0;">Se o botão não funcionar, copie e cole este link no navegador:<br/><a href="${linkBotao}" style="color:#00875F;word-break:break-all;">${linkBotao}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;background:#F3F5F7;border-top:1px solid #DCE1E7;">
              <p style="margin:0;font-size:11.5px;color:#8A93A0;">ConectaLog · Gestão de motoboys, do início ao fim do turno.<br/>Se você não pediu isso, pode ignorar este e-mail com segurança.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function enviarEmailVerificacaoUsuario(
  destinatario: string,
  nome: string,
  token: string
): Promise<{ sucesso: boolean }> {
  const resend = cliente();
  if (!resend) {
    console.warn("RESEND_API_KEY não configurada — e-mail de verificação não enviado.");
    return { sucesso: false };
  }

  const link = `${SITE_URL}/verificar-email/${token}`;
  const html = layoutEmail({
    titulo: `Oi, ${escaparHtml(nome.split(" ")[0])}! Confirme seu e-mail`,
    paragrafos: [
      "Falta só um passo pra ativar sua cooperativa no ConectaLog — confirmar que este e-mail é seu de verdade.",
      "O link abaixo vale por 24 horas.",
    ],
    textoBotao: "Confirmar meu e-mail",
    linkBotao: link,
  });

  try {
    await resend.emails.send({
      from: REMETENTE,
      to: destinatario,
      subject: "Confirme seu e-mail — ConectaLog",
      html,
    });
    return { sucesso: true };
  } catch (err) {
    console.error("Falha ao enviar e-mail de verificação:", err);
    return { sucesso: false };
  }
}

export async function enviarEmailConviteEquipe(
  destinatario: string,
  nomeEmpresa: string,
  token: string
): Promise<{ sucesso: boolean }> {
  const resend = cliente();
  if (!resend) {
    console.warn("RESEND_API_KEY não configurada — convite de equipe não enviado.");
    return { sucesso: false };
  }

  const link = `${SITE_URL}/equipe/aceitar/${token}`;
  const html = layoutEmail({
    titulo: `Você foi convidado pra equipe da ${escaparHtml(nomeEmpresa)}`,
    paragrafos: [
      `A cooperativa <strong>${escaparHtml(nomeEmpresa)}</strong> te convidou pra fazer parte da equipe dela no ConectaLog.`,
      "Clique no botão abaixo pra criar sua senha e começar a usar. O convite vale por 7 dias.",
    ],
    textoBotao: "Aceitar convite",
    linkBotao: link,
  });

  try {
    await resend.emails.send({
      from: REMETENTE,
      to: destinatario,
      subject: `Convite para a equipe da ${nomeEmpresa} — ConectaLog`,
      html,
    });
    return { sucesso: true };
  } catch (err) {
    console.error("Falha ao enviar convite de equipe:", err);
    return { sucesso: false };
  }
}

export async function enviarEmailRecuperacaoSenhaUsuario(
  destinatario: string,
  nome: string,
  token: string
): Promise<{ sucesso: boolean }> {
  const resend = cliente();
  if (!resend) {
    console.warn("RESEND_API_KEY não configurada — e-mail de recuperação não enviado.");
    return { sucesso: false };
  }

  const link = `${SITE_URL}/redefinir-senha/${token}`;
  const html = layoutEmail({
    titulo: `Oi, ${escaparHtml(nome.split(" ")[0] || "tudo bem")}! Vamos criar uma senha nova`,
    paragrafos: [
      "Recebemos um pedido pra redefinir a senha da sua conta no ConectaLog.",
      "O link abaixo vale por 24 horas. Se não foi você quem pediu, pode ignorar este e-mail.",
    ],
    textoBotao: "Criar senha nova",
    linkBotao: link,
  });

  try {
    await resend.emails.send({
      from: REMETENTE,
      to: destinatario,
      subject: "Recuperação de senha — ConectaLog",
      html,
    });
    return { sucesso: true };
  } catch (err) {
    console.error("Falha ao enviar e-mail de recuperação de senha:", err);
    return { sucesso: false };
  }
}

export async function enviarEmailRecuperacaoSenhaMotoboy(
  destinatario: string,
  nome: string,
  token: string
): Promise<{ sucesso: boolean }> {
  const resend = cliente();
  if (!resend) {
    console.warn("RESEND_API_KEY não configurada — e-mail de recuperação não enviado.");
    return { sucesso: false };
  }

  const link = `${SITE_URL}/app/redefinir-senha/${token}`;
  const html = layoutEmail({
    titulo: `Oi, ${escaparHtml(nome.split(" ")[0] || "tudo bem")}! Vamos criar uma senha nova`,
    paragrafos: [
      "Recebemos um pedido pra redefinir a senha da sua conta no ConectaLog.",
      "O link abaixo vale por 24 horas. Se não foi você quem pediu, pode ignorar este e-mail.",
    ],
    textoBotao: "Criar senha nova",
    linkBotao: link,
  });

  try {
    await resend.emails.send({
      from: REMETENTE,
      to: destinatario,
      subject: "Recuperação de senha — ConectaLog",
      html,
    });
    return { sucesso: true };
  } catch (err) {
    console.error("Falha ao enviar e-mail de recuperação de senha:", err);
    return { sucesso: false };
  }
}

export async function enviarEmailVerificacaoMotoboy(
  destinatario: string,
  nome: string,
  token: string
): Promise<{ sucesso: boolean }> {
  const resend = cliente();
  if (!resend) {
    console.warn("RESEND_API_KEY não configurada — e-mail de verificação não enviado.");
    return { sucesso: false };
  }

  const link = `${SITE_URL}/app/verificar-email/${token}`;
  const html = layoutEmail({
    titulo: `Oi, ${escaparHtml(nome.split(" ")[0])}! Confirme seu e-mail`,
    paragrafos: [
      "Falta só um passo pra ativar sua conta no ConectaLog — confirmar que este e-mail é seu de verdade.",
      "O link abaixo vale por 24 horas.",
    ],
    textoBotao: "Confirmar meu e-mail",
    linkBotao: link,
  });

  try {
    await resend.emails.send({
      from: REMETENTE,
      to: destinatario,
      subject: "Confirme seu e-mail — ConectaLog",
      html,
    });
    return { sucesso: true };
  } catch (err) {
    console.error("Falha ao enviar e-mail de verificação:", err);
    return { sucesso: false };
  }
}

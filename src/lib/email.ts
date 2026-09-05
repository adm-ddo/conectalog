import "server-only";
import { Resend } from "resend";

const SITE_URL = "https://conectalog.app.br";
const REMETENTE = "ConectaLog <contato@conectalog.app.br>";
/// Pra onde vai o aviso de novo lead comercial — o Thiago, dono da
/// plataforma. Não é configurável por env de propósito: só existe um
/// dono do ConectaLog hoje.
const EMAIL_DONO = "thiagodier@gmail.com";

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
      subject: "Confirme seu e-mail — ConectaLog (motoboy)",
      html,
    });
    return { sucesso: true };
  } catch (err) {
    console.error("Falha ao enviar e-mail de verificação:", err);
    return { sucesso: false };
  }
}

/** Manda a nota fiscal de serviço semanal (PDF em anexo) pro contato
 * financeiro do Cliente — sem botão/link de propósito (diferente de
 * layoutEmail): o conteúdo que importa é o anexo, o contato financeiro
 * não tem login nenhum no ConectaLog pra "ver mais". */
export async function enviarEmailFaturaCliente(params: {
  destinatario: string;
  nomeContato: string;
  nomeCliente: string;
  nomeCooperativa: string;
  periodoInicio: string;
  periodoFim: string;
  valorTotal: string;
  pdfBuffer: Buffer;
  nomeArquivo: string;
}): Promise<{ sucesso: boolean }> {
  const resend = cliente();
  if (!resend) {
    console.warn("RESEND_API_KEY não configurada — nota fiscal não enviada.");
    return { sucesso: false };
  }

  const primeiroNome = escaparHtml(params.nomeContato.split(" ")[0] || params.nomeContato);
  const periodo = `${params.periodoInicio.split("-").reverse().join("/")} até ${params.periodoFim.split("-").reverse().join("/")}`;
  const html = `<!DOCTYPE html>
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
              <h1 style="margin:0 0 16px;font-size:21px;font-weight:900;color:#14171A;letter-spacing:-.01em;">Nota fiscal de serviço — ${escaparHtml(params.nomeCliente)}</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3D4952;">Oi, ${primeiroNome}! Segue em anexo a nota fiscal de serviço da <strong>${escaparHtml(params.nomeCooperativa)}</strong> referente ao período de <strong>${periodo}</strong>.</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3D4952;">Valor total do período: <strong>R$ ${escaparHtml(params.valorTotal)}</strong>.</p>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#3D4952;">Qualquer dúvida sobre os valores, é só responder este e-mail.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 32px;background:#F3F5F7;border-top:1px solid #DCE1E7;">
              <p style="margin:0;font-size:11.5px;color:#8A93A0;">ConectaLog · Gestão de motoboys, do início ao fim do turno.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: REMETENTE,
      to: params.destinatario,
      subject: `Nota fiscal de serviço — ${params.nomeCliente} (${periodo})`,
      html,
      attachments: [{ filename: params.nomeArquivo, content: params.pdfBuffer }],
    });
    return { sucesso: true };
  } catch (err) {
    console.error("Falha ao enviar nota fiscal de serviço:", err);
    return { sucesso: false };
  }
}

/** Avisa o dono da plataforma que alguém pediu contato pela landing
 * comercial (raiz do domínio) — o lead em si já fica salvo no banco
 * (LeadComercial), isso aqui é só o alerta em tempo real. O botão vira
 * "chamar no WhatsApp" ou "responder por e-mail" dependendo do que a
 * pessoa deixou como contato. */
export async function enviarEmailLeadComercial(lead: {
  nome: string;
  contato: string;
  mensagem: string | null;
}): Promise<{ sucesso: boolean }> {
  const resend = cliente();
  if (!resend) {
    console.warn("RESEND_API_KEY não configurada — lead comercial não notificado por e-mail.");
    return { sucesso: false };
  }

  const ehEmail = lead.contato.includes("@");
  const digitos = lead.contato.replace(/\D/g, "");
  const linkBotao = ehEmail
    ? `mailto:${lead.contato}`
    : digitos
      ? `https://wa.me/${digitos.startsWith("55") ? digitos : `55${digitos}`}`
      : SITE_URL;
  const textoBotao = ehEmail ? "Responder por e-mail" : "Chamar no WhatsApp";

  const html = layoutEmail({
    titulo: `Novo pedido de contato: ${escaparHtml(lead.nome)}`,
    paragrafos: [
      `<strong>${escaparHtml(lead.nome)}</strong> pediu contato pela página comercial do ConectaLog.`,
      `Contato informado: <strong>${escaparHtml(lead.contato)}</strong>`,
      ...(lead.mensagem ? [`Mensagem: "${escaparHtml(lead.mensagem)}"`] : []),
    ],
    textoBotao,
    linkBotao,
  });

  try {
    await resend.emails.send({
      from: REMETENTE,
      to: EMAIL_DONO,
      subject: `Novo lead: ${lead.nome} — ConectaLog`,
      html,
    });
    return { sucesso: true };
  } catch (err) {
    console.error("Falha ao enviar e-mail de lead comercial:", err);
    return { sucesso: false };
  }
}

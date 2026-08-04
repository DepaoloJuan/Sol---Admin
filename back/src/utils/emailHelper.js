const logger = require("./logger");

let resendClient = null;
if (process.env.RESEND_API_KEY) {
  const { Resend } = require("resend");
  resendClient = new Resend(process.env.RESEND_API_KEY);
} else {
  logger.warn("email.resend.no_configurado");
}

// Colores/tipografías calcados de tailwind.config.js de landingPageSol, para
// que el mail se sienta parte de la misma marca. Todo inline y por tabla:
// los clientes de mail (Outlook en particular) ignoran <style> y flexbox/grid.
const COLOR_CHARCOAL = "#2A2A2A";
const COLOR_GOLD = "#C5A880";
const COLOR_BEIGE_LIGHT = "#FAF9F6";
const COLOR_CREAM = "#FDFCF0";
const FUENTE_SERIF = "Georgia, 'Times New Roman', serif";
const FUENTE_SANS = "Arial, Helvetica, sans-serif";

const plantillaResetPassword = (resetUrl) => `
<!DOCTYPE html>
<html lang="es">
  <body style="margin:0; padding:0; background-color:${COLOR_BEIGE_LIGHT}; font-family:${FUENTE_SANS};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLOR_BEIGE_LIGHT}; padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:${COLOR_CREAM}; border-radius:16px; overflow:hidden;">
            <tr>
              <td style="background-color:${COLOR_CHARCOAL}; padding:28px 32px; text-align:center;">
                <span style="font-family:${FUENTE_SERIF}; font-size:24px; color:#ffffff; letter-spacing:1px;">Sol Cantero</span>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px;">
                <p style="margin:0 0 16px; font-family:${FUENTE_SERIF}; font-size:20px; color:${COLOR_CHARCOAL};">
                  Recuperar tu contraseña
                </p>
                <p style="margin:0 0 24px; font-size:14px; line-height:22px; color:${COLOR_CHARCOAL};">
                  Recibimos un pedido para restablecer la contraseña de tu cuenta de Mi Fidelidad. Si fuiste vos, tocá el botón de abajo para elegir una nueva.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="border-radius:24px; background-color:${COLOR_GOLD};">
                      <a href="${resetUrl}" style="display:inline-block; padding:14px 32px; font-family:${FUENTE_SANS}; font-size:14px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:24px;">
                        Elegir nueva contraseña
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px; font-size:12px; line-height:18px; color:#8a8a8a;">
                  Este link vence en 1 hora. Si no fuiste vos, podés ignorar este mail tranquila — tu contraseña actual sigue funcionando.
                </p>
                <p style="margin:0; font-size:12px; line-height:18px; color:#8a8a8a;">
                  ¿El botón no funciona? Copiá y pegá este link en el navegador:<br />
                  <a href="${resetUrl}" style="color:${COLOR_GOLD}; word-break:break-all;">${resetUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px; text-align:center; background-color:${COLOR_BEIGE_LIGHT};">
                <span style="font-size:11px; color:#a8a8a8;">Sol Cantero — Centro de Belleza</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

const textoPlanoResetPassword = (resetUrl) =>
  `Recibimos un pedido para restablecer tu contraseña de Mi Fidelidad.\n\n` +
  `Elegí una nueva contraseña acá: ${resetUrl}\n\n` +
  `Este link vence en 1 hora. Si no fuiste vos, ignorá este mail.`;

const enviarEmailResetPassword = async (destinatario, resetUrl) => {
  if (!resendClient) {
    logger.error("email.reset.no_enviado", { motivo: "RESEND_API_KEY no configurada", destinatario });
    return;
  }

  try {
    await resendClient.emails.send({
      from: process.env.RESEND_FROM || "Sol Cantero <onboarding@resend.dev>",
      replyTo: process.env.RESEND_REPLY_TO || "juanmanueldepaolo@gmail.com",
      to: [destinatario],
      subject: "Recuperar contraseña — Sol Cantero",
      html: plantillaResetPassword(resetUrl),
      text: textoPlanoResetPassword(resetUrl),
    });
  } catch (error) {
    logger.error("email.reset.failed", { error: error.message, destinatario });
  }
};

module.exports = { enviarEmailResetPassword };

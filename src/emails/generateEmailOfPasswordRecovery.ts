export async function generateEmailOfPasswordRecovery(name: string, recoveryLink: string): Promise<string> {
  const year = new Date().getFullYear();
  const html = `
  <html>
    <body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color: #f7f7fb; color: #1f2937;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f7fb;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06); margin-top: 40px;">
              <tr style="background-color: #111827;">
                <td align="center" style="padding: 24px;">
                  <h1 style="margin: 0; font-size: 22px; color: #ffffff;">Fudmasters</h1>
                </td>
              </tr>
              <tr>
                <td align="left" style="padding: 24px 32px 0 32px;">
                  <h2 style="margin: 0; font-size: 22px; color: #111827;">Recuperación de contraseña</h2>
                </td>
              </tr>
              <tr>
                <td style="padding: 16px 32px 8px 32px;">
                  <p style="font-size: 15px; color: #1f2937;">Hola <strong>${name}</strong>,</p>
                  <p style="font-size: 15px; color: #1f2937;">Hemos recibido una solicitud para restablecer tu contraseña.</p>
                  <p style="font-size: 15px; color: #1f2937;">Haz clic en el siguiente botón para crear una nueva contraseña:</p>
                  <div style="text-align: center; margin: 24px 0;">
                    <a href="${recoveryLink}" style="background-color: #2563eb; color: #ffffff; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Restablecer contraseña</a>
                  </div>
                  <p style="font-size: 14px; color: #6b7280;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
                  <p style="font-size: 13px; color: #9ca3af; text-align: center; margin-top: 20px;">Si el botón no funciona, utiliza este enlace: ${recoveryLink}</p>
                </td>
              </tr>
              <tr style="background-color: #111827;">
                <td align="center" style="padding: 16px; color: #e5e7eb;">
                  <p style="margin: 0; font-size: 12px;">© ${year} Fudmasters.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
  return html;
}

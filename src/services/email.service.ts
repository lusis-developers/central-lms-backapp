import { Resend } from "resend";
import { generateEmailOfUserPassword } from "../emails/generateEmailOfUserPassword";
import { generateEmailOfPasswordRecovery } from "../emails/generateEmailOfPasswordRecovery";

export class EmailService {
  private resend: Resend;

  constructor() {
    const key = process.env.RESEND_API_KEY?.trim();
    if (!key) {
      throw new Error("Missing RESEND_API_KEY env var");
    }
    this.resend = new Resend(key);
  }

  async sendTemporaryPassword(to: string, name: string, password: string): Promise<void> {
    const loginLink = `${process.env.FRONTEND_URL || "https://fudmaster.com.ec"}/login`;
    const html = await generateEmailOfUserPassword(name, to, password, loginLink);
    const from = (process.env.RESEND_FROM_EMAIL?.trim() || "no-reply@fudmaster.com.ec");
    const { error } = await this.resend.emails.send({
      to,
      from,
      subject: "Your Fudmasters account",
      html,
    });
    if (error) {
      throw new Error(`Problem sending email: ${error}`);
    }
  }

  async sendPasswordRecovery(to: string, name: string, token: string): Promise<void> {
    const recoveryLink = `${process.env.FRONTEND_URL || "https://fudmaster.com.ec"}/reset-password?token=${token}`;
    const html = await generateEmailOfPasswordRecovery(name, recoveryLink);
    const from = (process.env.RESEND_FROM_EMAIL?.trim() || "no-reply@fudmaster.com.ec");
    const { error } = await this.resend.emails.send({
      to,
      from,
      subject: "Recuperación de contraseña Fudmasters",
      html,
    });
    if (error) {
      throw new Error(`Problem sending email: ${error}`);
    }
  }
}

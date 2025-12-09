import { Resend } from "resend";
import { generateEmailOfUserPassword } from "../emails/generateEmailOfUserPassword";

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
    const { error } = await this.resend.emails.send({
      to,
      from: "no-reply@fudmaster.com.ec",
      subject: "Your Fudmasters account",
      html,
    });
    if (error) {
      throw new Error(`Problem sending email: ${error}`);
    }
  }
}

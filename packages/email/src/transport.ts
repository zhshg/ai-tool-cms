import nodemailer from "nodemailer";
import { getEnv } from "@ai-tool-cms/config";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(input: SendEmailInput): Promise<{ messageId: string }> {
  const env = getEnv();
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false,
    auth:
      env.SMTP_USER && env.SMTP_PASSWORD
        ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
        : undefined,
  });

  const info = await transporter.sendMail({
    from: env.NEWSLETTER_FROM_EMAIL ?? `noreply@${new URL(env.APP_URL).hostname}`,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  return { messageId: info.messageId };
}

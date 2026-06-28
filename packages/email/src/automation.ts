import type { EmailTemplateType, PrismaClient } from "@ai-tool-cms/database";
import { sendEmail } from "./transport";

export async function renderTemplate(
  prisma: PrismaClient,
  type: EmailTemplateType,
  variables: Record<string, string> = {},
): Promise<{ subject: string; html: string; text?: string } | null> {
  const template = await prisma.emailTemplate.findFirst({
    where: { type, deletedAt: null },
    orderBy: { updatedAt: "desc" },
  });

  if (!template) {
    return null;
  }

  let subject = template.subject;
  let html = template.bodyHtml;
  let text = template.bodyText ?? undefined;

  for (const [key, value] of Object.entries(variables)) {
    const token = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    subject = subject.replace(token, value);
    html = html.replace(token, value);
    if (text) {
      text = text.replace(token, value);
    }
  }

  return { subject, html, text };
}

export async function sendTemplatedEmail(
  prisma: PrismaClient,
  type: EmailTemplateType,
  to: string,
  variables: Record<string, string> = {},
): Promise<{ ok: boolean; messageId?: string }> {
  const rendered = await renderTemplate(prisma, type, variables);
  if (!rendered) {
    return { ok: false };
  }

  const result = await sendEmail({
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });

  await prisma.emailSendLog.create({
    data: {
      toEmail: to,
      subject: rendered.subject,
      status: "sent",
      metadata: { type, messageId: result.messageId },
    },
  });

  return { ok: true, messageId: result.messageId };
}

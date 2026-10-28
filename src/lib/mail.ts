import nodemailer from "nodemailer";

export type Mail = { to: string; subject: string; text: string };

const serverless = () => !!(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);

/**
 * Sends through SMTP_URL, e.g. smtps://you%40gmail.com:app-password@smtp.gmail.com:465 or Resend's SMTP.
 * Without it, prints the message locally (handy for reset links in dev) and reports false.
 */
export async function sendMail(mail: Mail): Promise<boolean> {
  const url = process.env.SMTP_URL;
  if (!url) {
    if (!serverless()) console.log(`[mail] to ${mail.to}: ${mail.subject}\n${mail.text}`);
    return false;
  }
  // Gmail only sends as the signed-in account, so default the sender to the SMTP user.
  const user = decodeURIComponent(new URL(url).username);
  const from = process.env.MAIL_FROM ?? (user.includes("@") ? `RegretNothing <${user}>` : "RegretNothing <no-reply@localhost>");
  try {
    await nodemailer.createTransport(url).sendMail({ from, ...mail });
    return true;
  } catch (err) {
    console.error("[mail] send failed:", (err as Error).message);
    return false;
  }
}

import { env } from '../../../config/env.js';

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Swappable email interface.
 * In production replace with SendGrid / SES / Resend / etc.
 */
export interface IEmailProvider {
  send(payload: EmailPayload): Promise<void>;
}

class ConsoleEmailProvider implements IEmailProvider {
  async send(payload: EmailPayload): Promise<void> {
    console.log('\n📧 [EMAIL STUB] ─────────────────────────────────');
    console.log(`To:      ${payload.to}`);
    console.log(`Subject: ${payload.subject}`);
    console.log(`Body:\n${payload.text}`);
    console.log('────────────────────────────────────────────────\n');
  }
}

export class EmailService {
  constructor(private readonly provider: IEmailProvider = new ConsoleEmailProvider()) {}

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const link = `${env.APP_URL}/verify-email?token=${token}`;
    await this.provider.send({
      to: email,
      subject: 'Verify your email address',
      text: `Please verify your email by clicking: ${link}\n\nThis link expires in 24 hours.`,
      html: `<p>Please verify your email by clicking <a href="${link}">here</a>.</p><p>This link expires in 24 hours.</p>`,
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const link = `${env.APP_URL}/reset-password?token=${token}`;
    await this.provider.send({
      to: email,
      subject: 'Reset your password',
      text: `Reset your password using this link: ${link}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.`,
      html: `<p>Reset your password using <a href="${link}">this link</a>.</p><p>Expires in 1 hour.</p>`,
    });
  }
}

export const emailService = new EmailService();
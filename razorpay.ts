import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { db } from './db.ts';

const SANDBOX_FALLBACK_SECRET = crypto
  .createHash('sha256')
  .update(`nexora-rzp-sandbox-${process.cwd()}`)
  .digest('hex');

export function isLiveRazorpayConfigured(): boolean {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  return (
    Boolean(keyId && keySecret) &&
    !keyId.includes('xxxxxxxx') &&
    !keySecret.includes('your_razorpay')
  );
}

export function getPublicRazorpayKey(): string {
  if (isLiveRazorpayConfigured()) {
    return process.env.RAZORPAY_KEY_ID as string;
  }
  return 'rzp_test_nexora_sandbox';
}

export async function createRazorpayOrder(params: {
  amountInRupees: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string; mode: 'live' | 'sandbox' }> {
  const amountPaise = Math.max(100, Math.round(params.amountInRupees * 100));

  if (isLiveRazorpayConfigured()) {
    const keyId = process.env.RAZORPAY_KEY_ID as string;
    const keySecret = process.env.RAZORPAY_KEY_SECRET as string;
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const resp = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt: params.receipt,
        notes: params.notes || {},
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      throw new Error(`Razorpay order creation failed: ${errBody}`);
    }

    const data = (await resp.json()) as { id: string; amount: number; currency: string };
    return { id: data.id, amount: data.amount, currency: data.currency, mode: 'live' };
  }

  // Deterministic sandbox Razorpay order ID (verifiable server-side with HMAC-SHA256)
  const sandboxOrderId = `order_Nx${crypto.randomBytes(7).toString('hex')}`;
  return {
    id: sandboxOrderId,
    amount: amountPaise,
    currency: 'INR',
    mode: 'sandbox',
  };
}

export function generateSandboxPaymentSignature(razorpayOrderId: string, razorpayPaymentId: string): string {
  return crypto
    .createHmac('sha256', SANDBOX_FALLBACK_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
}

export function verifyRazorpaySignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  mode: 'live' | 'sandbox';
}): boolean {
  const secret =
    params.mode === 'live' && isLiveRazorpayConfigured()
      ? (process.env.RAZORPAY_KEY_SECRET as string)
      : SANDBOX_FALLBACK_SECRET;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest('hex');

  const actualBuf = Buffer.from(params.razorpaySignature || '', 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');
  if (actualBuf.length !== expectedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

export async function dispatchOrderConfirmationEmail(params: {
  toEmail: string;
  customerName: string;
  orderNumber: string;
  totalAmount: number;
  paymentId: string;
  productNames: string[];
}): Promise<void> {
  const subject = `Order Confirmed: ${params.orderNumber} — Your NEXORA Download Is Ready`;
  const previewText = `Hello ${params.customerName}, your Razorpay payment (${params.paymentId}) of INR ${params.totalAmount.toLocaleString('en-IN')} is verified. Unlocked items: ${params.productNames.join(', ')}. Access them anytime in your Download Library.`;

  let emailStatus = 'sent';

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass && !smtpPass.includes('xxxxxxxx')) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT || 465),
        secure: Number(process.env.SMTP_PORT || 465) === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'NEXORA <orders@nexora.digital>',
        to: params.toEmail,
        subject,
        text: previewText,
        html: `
          <div style="font-family:sans-serif;background:#05070e;color:#f8fafc;padding:32px;border-radius:12px;">
            <h1 style="margin:0 0 8px;font-size:22px;letter-spacing:0.08em;">NEXORA</h1>
            <p style="color:#94a3b8;margin:0 0 24px;">Digital Products. Unlimited Possibilities.</p>
            <h2 style="font-size:18px;margin:0 0 12px;">Order ${params.orderNumber} Confirmed</h2>
            <p style="line-height:1.6;color:#cbd5e1;">${previewText}</p>
            <p style="margin-top:24px;font-size:13px;color:#64748b;">Payment Ref: ${params.paymentId}</p>
          </div>
        `,
      });
    } catch (err) {
      console.error('SMTP email dispatch failed, logged locally:', err);
      emailStatus = 'logged_fallback';
    }
  } else {
    emailStatus = 'logged_sandbox';
  }

  db.prepare(`
    INSERT INTO email_logs (recipient_email, subject, order_number, status, preview_text)
    VALUES (?, ?, ?, ?, ?)
  `).run(params.toEmail, subject, params.orderNumber, emailStatus, previewText);
}

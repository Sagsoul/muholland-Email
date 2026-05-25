import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Email forwarding configuration
const FORWARDING_MAP: Record<string, string> = {
  'doug@muholland.com': 'dougjaff@gmail.com',
  'rura@muholland.com': 'majrue4@gmail.com',
  'anesu@muholland.com': 'scratchedanddent@gmail.com',
  'scratchedanddent@muholland.com': 'scratchedanddent@gmail.com',
};

// Initialize nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Verify Resend webhook signature
function verifyResendSignature(
  signature: string,
  body: string,
  secret: string
): boolean {
  try {
    const hmac = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(hmac),
      Buffer.from(signature)
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('resend-signature');
    const secret = process.env.RESEND_WEBHOOK_SECRET || '';

    // Verify signature
    if (!signature || !verifyResendSignature(signature, body, secret)) {
      console.warn('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(body);
    const { type, data } = payload;

    // Only process email.received events
    if (type !== 'email.received') {
      return NextResponse.json({ status: 'ignored' });
    }

    const { from, to, subject, text, html, attachments } = data;

    // Check if there's a forwarding rule for this email
    const forwardTo = FORWARDING_MAP[to];

    if (!forwardTo) {
      console.log(`No forwarding rule found for ${to}`);
      return NextResponse.json({ status: 'no_rule' });
    }

    console.log(`Forwarding email from ${from} (to: ${to}) -> ${forwardTo}`);

    // Prepare the forwarded email
    const mailOptions = {
      from: process.env.FORWARD_FROM_EMAIL || 'noreply@muholland.com',
      to: forwardTo,
      replyTo: from,
      subject: subject,
      text: formatPlainText(from, to, subject, text),
      html: formatHtmlEmail(from, to, subject, html || text),
      attachments: attachments || [],
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    console.log(`Email successfully forwarded to ${forwardTo}`);
    return NextResponse.json({ status: 'forwarded', to: forwardTo });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Processing failed', details: String(error) },
      { status: 500 }
    );
  }
}

// Format plain text email
function formatPlainText(
  from: string,
  to: string,
  subject: string,
  text: string
): string {
  return `\n\n---------- Forwarded message ---------
From: ${from}
Date: ${new Date().toISOString()}
Subject: ${subject}
To: ${to}

${text}`;
}

// Format HTML email
function formatHtmlEmail(
  from: string,
  to: string,
  subject: string,
  html: string
): string {
  return `
    <div style="font-family: Arial, sans-serif;">
      <p><strong>---------- Forwarded message ---------</strong></p>
      <p><strong>From:</strong> ${from}</p>
      <p><strong>Date:</strong> ${new Date().toISOString()}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>To:</strong> ${to}</p>
      <hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;">
      <div>
        ${html}
      </div>
    </div>
  `;
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json(
    { message: 'Email forwarding webhook is running' },
    { status: 200 }
  );
}

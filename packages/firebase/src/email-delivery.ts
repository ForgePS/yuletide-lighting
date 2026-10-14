import { htmlMessageToPlainText, isMessageProviderSendEnabled, looksLikeHtmlMessage } from '@clcrm/types';

export type CustomerEmailDeliveryResult =
  | { status: 'sent'; providerMessageId: string | null }
  | { status: 'disabled'; reason: string }
  | { status: 'failed'; reason: string };

export class EmailDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailDeliveryError';
  }
}

type Env = Record<string, string | undefined>;
type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/** Wraps a bare address with the company display name; leaves `Name <addr>` values untouched. */
export function formatFromAddress(fromEmail: string, companyName?: string | null): string {
  const from = fromEmail.trim();
  if (from.includes('<')) return from;
  const name = (companyName ?? '').replace(/["<>\r\n]/g, '').trim();
  return name ? `"${name}" <${from}>` : from;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function plainTextToEmailHtml(text: string): string {
  const paragraphs = text
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px">${escapeHtml(p).replace(/\r?\n/g, '<br>')}</p>`)
    .join('');
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1f2937">${paragraphs}</div>`;
}

/** Strips active content from editor HTML before it goes to a customer's inbox. */
export function sanitizeEmailHtml(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed|form)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|iframe|object|embed|form|input|meta|link)\b[^>]*\/?>/gi, '')
    .replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1="#"');
}

export function richHtmlToEmailHtml(html: string): string {
  const body = sanitizeEmailHtml(html).replace(/<p>\s*<\/p>/gi, '<p>&nbsp;</p>');
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1f2937">${body}</div>`;
}

export async function deliverCustomerEmail(
  input: {
    to: string;
    subject: string;
    text: string;
    companyName?: string | null;
    replyTo?: string | null;
  },
  options: { env?: Env; fetchImpl?: FetchLike } = {},
): Promise<CustomerEmailDeliveryResult> {
  const env = options.env ?? process.env;
  if (!isMessageProviderSendEnabled('email', env)) {
    return { status: 'disabled', reason: 'Email delivery is off (set REAL_EMAIL=1 and RESEND_API_KEY)' };
  }
  const fromEmail = env.RESEND_FROM_EMAIL?.trim();
  if (!fromEmail) {
    return { status: 'disabled', reason: 'RESEND_FROM_EMAIL is not configured' };
  }

  const isHtml = looksLikeHtmlMessage(input.text);
  const text = isHtml ? htmlMessageToPlainText(input.text) : input.text;
  const html = isHtml ? richHtmlToEmailHtml(input.text) : plainTextToEmailHtml(input.text);

  const fetchImpl = options.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: formatFromAddress(fromEmail, input.companyName),
        to: input.to,
        subject: input.subject,
        text,
        html,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });
  } catch (err) {
    return { status: 'failed', reason: err instanceof Error ? err.message : 'Email request failed' };
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    let reason = `Resend HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(detail) as { message?: string };
      if (parsed.message) reason = `${reason}: ${parsed.message}`;
    } catch {
      if (detail) reason = `${reason}: ${detail.slice(0, 200)}`;
    }
    return { status: 'failed', reason };
  }

  const data = (await res.json().catch(() => null)) as { id?: string } | null;
  return { status: 'sent', providerMessageId: data?.id ?? null };
}

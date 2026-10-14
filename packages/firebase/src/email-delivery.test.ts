import { describe, expect, it, vi } from 'vitest';
import { deliverCustomerEmail, formatFromAddress, plainTextToEmailHtml } from './email-delivery';

const liveEnv = {
  REAL_EMAIL: '1',
  RESEND_API_KEY: 're_test',
  RESEND_FROM_EMAIL: 'hello@example.com',
};

const message = { to: 'jane@example.com', subject: 'Hi', text: 'Hello Jane' };

describe('email delivery', () => {
  it('does not call Resend unless REAL_EMAIL=1 and a key are set', async () => {
    const fetchImpl = vi.fn();
    const result = await deliverCustomerEmail(message, {
      env: { RESEND_API_KEY: 're_test', RESEND_FROM_EMAIL: 'hello@example.com' },
      fetchImpl,
    });
    expect(result.status).toBe('disabled');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('requires a from address', async () => {
    const fetchImpl = vi.fn();
    const result = await deliverCustomerEmail(message, {
      env: { REAL_EMAIL: '1', RESEND_API_KEY: 're_test' },
      fetchImpl,
    });
    expect(result).toEqual({ status: 'disabled', reason: 'RESEND_FROM_EMAIL is not configured' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('sends through Resend and returns the provider id', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'em_123' }), { status: 200 }));
    const result = await deliverCustomerEmail(
      { ...message, companyName: 'Acme Lights', replyTo: 'office@acme.test' },
      { env: liveEnv, fetchImpl },
    );
    expect(result).toEqual({ status: 'sent', providerMessageId: 'em_123' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    const body = JSON.parse(init.body);
    expect(body.from).toBe('"Acme Lights" <hello@example.com>');
    expect(body.to).toBe('jane@example.com');
    expect(body.reply_to).toBe('office@acme.test');
    expect(init.headers.Authorization).toBe('Bearer re_test');
  });

  it('sends rich-text template HTML as formatted email with a readable text part', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'em_html' }), { status: 200 }));
    const html =
      '<p>Hi Jane,</p><p></p><p><strong>Book now &amp; save 10%</strong></p><p onclick="x()">Thanks</p><script>alert(1)</script>';
    await deliverCustomerEmail({ ...message, text: html }, { env: liveEnv, fetchImpl });
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.html).toContain('<strong>Book now &amp; save 10%</strong>');
    expect(body.html).not.toContain('&lt;p&gt;');
    expect(body.html).not.toContain('<script');
    expect(body.html).not.toContain('onclick');
    expect(body.text).toBe('Hi Jane,\n\nBook now & save 10%\n\nThanks');
  });

  it('reports Resend errors as failed', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ message: 'Domain not verified' }), { status: 403 }));
    const result = await deliverCustomerEmail(message, { env: liveEnv, fetchImpl });
    expect(result).toEqual({ status: 'failed', reason: 'Resend HTTP 403: Domain not verified' });
  });

  it('reports network errors as failed', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('ECONNRESET'));
    const result = await deliverCustomerEmail(message, { env: liveEnv, fetchImpl });
    expect(result).toEqual({ status: 'failed', reason: 'ECONNRESET' });
  });

  it('formats the from address', () => {
    expect(formatFromAddress('hello@example.com', 'Acme')).toBe('"Acme" <hello@example.com>');
    expect(formatFromAddress('hello@example.com', null)).toBe('hello@example.com');
    expect(formatFromAddress('Team <hello@example.com>', 'Acme')).toBe('Team <hello@example.com>');
    expect(formatFromAddress('hello@example.com', 'Bad "Name" <x>')).toBe('"Bad Name x" <hello@example.com>');
  });

  it('escapes HTML and keeps paragraphs', () => {
    const html = plainTextToEmailHtml('Hi <b>Jane</b>\nline two\n\nSecond para');
    expect(html).toContain('Hi &lt;b&gt;Jane&lt;/b&gt;<br>line two');
    expect(html).toContain('<p style="margin:0 0 16px">Second para</p>');
  });
});

import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';
import {
  classifyMessage,
  aiGenerateMessage,
  formatMessageLabel,
  isMessageProviderSendEnabled,
  renderMessageTemplate,
  resolveMessageDeliveryMode,
  resolveOutboundMessageStatus,
} from '@clcrm/types';
import { verifyTwilioRequestSignature, collectTwilioPhoneOrgMatches } from './messages360';

describe('messages360 helpers', () => {
  it('classifies payment questions', () => {
    const result = classifyMessage('When is my invoice due?');
    expect(result.category).toBe('payment_question');
    expect(result.priority).toBe('high');
  });

  it('classifies sales opportunities', () => {
    const result = classifyMessage('Can I get a quote for holiday lights?');
    expect(result.category).toBe('sales_opportunity');
  });

  it('classifies null/empty body safely', () => {
    expect(classifyMessage(null).category).toBe('general');
    expect(classifyMessage(undefined).category).toBe('general');
    expect(classifyMessage('').category).toBe('general');
  });

  it('renders template variables', () => {
    expect(renderMessageTemplate('Hi {{customerName}}', { customerName: 'Jane' })).toBe('Hi Jane');
    expect(renderMessageTemplate(null, { customerName: 'Jane' })).toBe('');
  });

  it('generates proposal follow-up', () => {
    const result = aiGenerateMessage('Write a proposal follow-up');
    expect(result.generatedText).toContain('{{customerName}}');
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('formats null-safe message labels', () => {
    expect(formatMessageLabel(null)).toBe('Unknown');
    expect(formatMessageLabel('')).toBe('Unknown');
    expect(formatMessageLabel('waiting_on_customer')).toBe('Waiting On Customer');
    expect(formatMessageLabel('proposal_sent')).toBe('Proposal Sent');
  });

  it('resolves record-only delivery mode by default', () => {
    expect(resolveMessageDeliveryMode('sms', {})).toBe('record_only');
    expect(resolveMessageDeliveryMode('email', { RESEND_API_KEY: 're_x' })).toBe('record_only');
    expect(
      resolveMessageDeliveryMode('sms', {
        REAL_SMS: '1',
        TWILIO_ACCOUNT_SID: 'ACxxx',
        TWILIO_AUTH_TOKEN: 'token',
      }),
    ).toBe('provider');
    expect(isMessageProviderSendEnabled('email', {})).toBe(false);
  });

  it('resolves honest outbound status without provider adapter', () => {
    expect(
      resolveOutboundMessageStatus({
        channel: 'sms',
        providerAdapterActive: false,
      }),
    ).toBe('recorded');
    expect(
      resolveOutboundMessageStatus({
        channel: 'sms',
        scheduledAt: new Date(Date.now() + 60_000),
        providerAdapterActive: false,
      }),
    ).toBe('queued');
    expect(
      resolveOutboundMessageStatus({
        channel: 'sms',
        providerAdapterActive: true,
        env: {
          REAL_SMS: '1',
          TWILIO_ACCOUNT_SID: 'ACxxx',
          TWILIO_AUTH_TOKEN: 'token',
        },
      }),
    ).toBe('sent');
  });

  it('fail-closes Twilio signature when token or signature missing', () => {
    expect(
      verifyTwilioRequestSignature({
        authToken: null,
        signature: 'sig',
        url: 'https://example.com/hook',
        params: { Body: 'hi' },
      }).ok,
    ).toBe(false);
    expect(
      verifyTwilioRequestSignature({
        authToken: 'secret',
        signature: null,
        url: 'https://example.com/hook',
        params: { Body: 'hi' },
      }).reason,
    ).toBe('SIGNATURE_MISSING');
  });

  it('accepts a valid Twilio HMAC-SHA1 signature', () => {
    const authToken = 'test_token';
    const url = 'https://example.com/webhooks/sms';
    const params = { Body: 'Hello', From: '+15551234567', To: '+15557654321' };
    const data =
      url +
      Object.keys(params)
        .sort()
        .reduce((acc, key) => acc + key + params[key as keyof typeof params], '');
    const signature = createHmac('sha1', authToken).update(Buffer.from(data, 'utf-8')).digest('base64');
    expect(
      verifyTwilioRequestSignature({
        authToken,
        signature,
        url,
        params,
      }),
    ).toEqual({ ok: true });
  });

  it('YL-S26: Twilio To-phone match is unique or empty (fail closed on collision)', () => {
    const orgs = [
      { id: 'org-a', twilioPhoneNumber: '+15557654321' },
      { id: 'org-b', twilioPhoneNumber: '+15550001111' },
    ];
    expect(collectTwilioPhoneOrgMatches(orgs, '+1 (555) 765-4321')).toEqual(['org-a']);
    expect(collectTwilioPhoneOrgMatches(orgs, '+15559999999')).toEqual([]);

    const colliding = [
      { id: 'org-a', twilioPhoneNumber: '+15557654321' },
      { id: 'org-b', twilioPhoneNumber: '5557654321' },
    ];
    expect(collectTwilioPhoneOrgMatches(colliding, '+15557654321')).toEqual(['org-a', 'org-b']);
  });
});

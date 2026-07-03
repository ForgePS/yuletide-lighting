import { describe, expect, it } from 'vitest';
import { classifyMessage, aiGenerateMessage, renderMessageTemplate } from '@clcrm/types';

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

  it('renders template variables', () => {
    expect(renderMessageTemplate('Hi {{customerName}}', { customerName: 'Jane' })).toBe('Hi Jane');
  });

  it('generates proposal follow-up', () => {
    const result = aiGenerateMessage('Write a proposal follow-up');
    expect(result.generatedText).toContain('{{customerName}}');
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});

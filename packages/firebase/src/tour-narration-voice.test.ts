import { describe, expect, it } from 'vitest';
import { pickNarrationVoice, scoreNarrationVoice } from '@clcrm/types';

describe('narration voice selection', () => {
  it('prefers a female English voice over male defaults', () => {
    const voices = [
      { name: 'Microsoft David - English (United States)', lang: 'en-US', localService: true },
      { name: 'Microsoft Zira - English (United States)', lang: 'en-US', localService: true },
    ];
    expect(pickNarrationVoice(voices)?.name).toContain('Zira');
  });

  it('prefers neural voices when available', () => {
    const voices = [
      { name: 'Microsoft Zira - English (United States)', lang: 'en-US', localService: true },
      { name: 'Microsoft Jenny Online (Natural) - English (United States)', lang: 'en-US' },
    ];
    expect(pickNarrationVoice(voices)?.name).toContain('Jenny');
    expect(scoreNarrationVoice(voices[1]!)).toBeGreaterThan(scoreNarrationVoice(voices[0]!));
  });
});

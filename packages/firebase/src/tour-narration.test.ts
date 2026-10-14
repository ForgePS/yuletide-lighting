import { describe, expect, it } from 'vitest';
import { buildStepNarration, estimateNarrationDurationMs } from '@clcrm/types';

describe('tour narration helpers', () => {
  it('builds spoken script from title and description', () => {
    expect(
      buildStepNarration({
        title: 'Command Center',
        description: 'Your seasonal operations hub.',
      }),
    ).toBe('Command Center. Your seasonal operations hub.');
  });

  it('prefers custom narration when provided', () => {
    expect(
      buildStepNarration({
        title: 'Ignored',
        description: 'Ignored',
        narration: 'Welcome to Yuletide.',
      }),
    ).toBe('Welcome to Yuletide.');
  });

  it('estimates a minimum narration duration', () => {
    expect(estimateNarrationDurationMs('Hi')).toBeGreaterThanOrEqual(2_500);
    const long = estimateNarrationDurationMs(
      'This is a longer narration script that should take more than a few seconds to read aloud.',
    );
    expect(long).toBeGreaterThan(3_000);
  });
});

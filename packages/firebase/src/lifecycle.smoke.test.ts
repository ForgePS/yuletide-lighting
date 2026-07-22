import { describe, expect, it } from 'vitest';
import { agreementSourceForProposal } from './proposal-acceptance';
import { haversineMiles, nearestNeighborOrder } from './geo';

/**
 * Lightweight lifecycle smoke — pure helpers that gate the connected workflow.
 * Full browser e2e requires Playwright (not yet configured); this guards regressions
 * in acceptance identity + routing math used by that path.
 */
describe('lifecycle smoke helpers', () => {
  it('keeps agreement source keys stable for idempotent acceptance', () => {
    expect(agreementSourceForProposal('prop_123')).toBe('proposal:prop_123');
  });

  it('orders route stops nearest-neighbor from a depot', () => {
    const ordered = nearestNeighborOrder(
      [
        { id: 'far', lat: 34.0, lng: -84.0 },
        { id: 'near', lat: 33.76, lng: -84.39 },
        { id: 'mid', lat: 33.85, lng: -84.3 },
      ],
      { lat: 33.75, lng: -84.39 },
    );
    expect(ordered[0]?.id).toBe('near');
    expect(haversineMiles(33.75, -84.39, 33.76, -84.39)).toBeLessThan(2);
  });
});

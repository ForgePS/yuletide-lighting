import { describe, expect, it } from 'vitest';
import { calculateMaterials, pixelDistance, strandPixelLength, aiGenerateDesign } from '@clcrm/types';

describe('mockups360 helpers', () => {
  it('calculates pixel distance', () => {
    expect(pixelDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('calculates strand length', () => {
    const strand = { id: '1', points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], color: '#FFD700', lightType: 'c9' as const, pattern: 'solid' as const, bulbSize: 6, spacing: 12, brightness: 1 };
    expect(strandPixelLength(strand)).toBe(100);
  });

  it('generates material list', () => {
    const materials = calculateMaterials({
      strands: [{ id: '1', points: [{ x: 0, y: 0 }, { x: 200, y: 0 }], color: '#FFD700', lightType: 'c9', pattern: 'solid', bulbSize: 6, spacing: 12, brightness: 1 }],
      scaleFeetPerPixel: 0.1,
    });
    expect(materials.totalLinearFeet).toBe(20);
    expect(materials.bulbCount).toBeGreaterThan(0);
  });

  it('generates AI design', () => {
    const result = aiGenerateDesign('premium design');
    expect(result.strands.length).toBeGreaterThan(0);
    expect(result.upsells.length).toBeGreaterThan(0);
  });
});

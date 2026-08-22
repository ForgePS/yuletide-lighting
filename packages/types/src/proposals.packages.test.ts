import { describe, expect, it } from 'vitest';
import {
  buildPackageEditorDraftsFromProposalPackages,
  inferPackageMarkupPercent,
  proposalPackagesAreFilled,
} from './proposals';

describe('YL-S7 package editor hydrate helpers', () => {
  it('infers markup percent from linear footage', () => {
    expect(inferPackageMarkupPercent(125, 100, 25)).toBe(25);
    expect(inferPackageMarkupPercent(undefined, 100, 25)).toBe(25);
  });

  it('hydrates Good/Better/Best drafts from proposal packages', () => {
    const drafts = buildPackageEditorDraftsFromProposalPackages(
      [
        {
          tier: 'basic',
          label: 'Good Deal',
          name: 'Good Deal',
          description: 'Base lights',
          products: ['C9 warm'],
          isRecommended: false,
          pricing: {
            linearFootage: 100,
            treeWrapCount: 0,
            garlandLengthFt: 0,
            wreathCount: 0,
            specialtyDecorCount: 0,
            laborHours: 8,
            equipmentChargeCents: 0,
            travelChargeCents: 0,
            materialCostCents: 0,
            laborCostCents: 0,
          },
        },
        {
          tier: 'recommended',
          label: 'Better Deal',
          name: 'Better Deal',
          description: 'Base + trees',
          products: ['C9 warm', 'Trees'],
          isRecommended: true,
          pricing: {
            linearFootage: 125,
            treeWrapCount: 0,
            garlandLengthFt: 0,
            wreathCount: 0,
            specialtyDecorCount: 0,
            laborHours: 8,
            equipmentChargeCents: 0,
            travelChargeCents: 0,
            materialCostCents: 0,
            laborCostCents: 0,
          },
        },
      ],
      { linearFootage: 100 },
    );
    expect(drafts).toHaveLength(3);
    expect(drafts[0].label).toBe('Good Deal');
    expect(drafts[1].label).toBe('Better Deal');
    expect(drafts[1].markupPercent).toBe(25);
    expect(drafts[1].isRecommended).toBe(true);
    expect(drafts[2].key).toBe('best');
    expect(proposalPackagesAreFilled(drafts)).toBe(true);
  });

  it('returns empty drafts when packages missing', () => {
    const drafts = buildPackageEditorDraftsFromProposalPackages(undefined);
    expect(drafts).toHaveLength(3);
    expect(proposalPackagesAreFilled(drafts)).toBe(false);
  });
});

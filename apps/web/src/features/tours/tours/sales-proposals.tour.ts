import type { YuletideTourDefinition } from '../types';
import { TOUR_TARGET_IDS } from '../config/tour-targets';

export const salesProposalsTour: YuletideTourDefinition = {
  id: 'sales-proposals',
  version: 1,
  name: 'Proposals',
  description: 'Walk through building, presenting, and closing proposals.',
  category: 'sales',
  estimatedMinutes: 3,
  availableModes: ['guided', 'self-guided', 'autoplay'],
  steps: [
    {
      id: 'proposals-hub',
      title: 'Proposal Workspace',
      description: 'Create new proposals, filter by status, and export your pipeline.',
      route: '/app/proposals',
      target: TOUR_TARGET_IDS.proposalsHub,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 5000,
    },
    {
      id: 'invoices',
      title: 'Deposits & Invoicing',
      description: 'After acceptance, collect deposits and track receivables on the AR dashboard.',
      route: '/app/invoices/dashboard',
      target: TOUR_TARGET_IDS.invoicesHub,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 5000,
    },
  ],
};

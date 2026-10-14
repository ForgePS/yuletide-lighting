import type { YuletideTourDefinition } from '../types';
import { TOUR_TARGET_IDS } from '../config/tour-targets';

export const gettingStartedProposalTour: YuletideTourDefinition = {
  id: 'getting-started-proposal',
  version: 1,
  name: 'Create Your First Proposal',
  description: 'Build scoped packages and send presentation-ready proposals to homeowners.',
  category: 'onboarding',
  estimatedMinutes: 2,
  availableModes: ['guided', 'self-guided', 'autoplay'],
  steps: [
    {
      id: 'proposals-hub',
      title: 'Proposals Hub',
      description: 'Create proposals from property data — list, dashboard, and pipeline views keep sales organized.',
      route: '/app/proposals',
      target: TOUR_TARGET_IDS.proposalsHub,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 5000,
    },
  ],
};

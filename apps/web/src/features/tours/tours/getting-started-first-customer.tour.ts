import type { YuletideTourDefinition } from '../types';
import { TOUR_TARGET_IDS } from '../config/tour-targets';

export const gettingStartedFirstCustomerTour: YuletideTourDefinition = {
  id: 'getting-started-first-customer',
  version: 1,
  name: 'Add Your First Customer',
  description: 'Learn how leads move through the pipeline and where customer records live.',
  category: 'onboarding',
  estimatedMinutes: 3,
  availableModes: ['guided', 'self-guided', 'autoplay'],
  steps: [
    {
      id: 'pipeline-board',
      title: 'Sales Pipeline',
      description: 'Drag cards between stages as leads progress — from first contact to booked work.',
      route: '/app/pipeline',
      target: TOUR_TARGET_IDS.pipelineBoard,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 5000,
    },
    {
      id: 'customers-list',
      title: 'Customer Directory',
      description: 'Every customer has a 360° profile with properties, proposals, jobs, and billing history.',
      route: '/app/customers',
      target: TOUR_TARGET_IDS.customersList,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 5000,
    },
  ],
};

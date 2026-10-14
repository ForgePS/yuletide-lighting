import type { YuletideTourDefinition } from '../types';
import { TOUR_TARGET_IDS } from '../config/tour-targets';

export const operationsServiceTour: YuletideTourDefinition = {
  id: 'operations-service',
  version: 1,
  name: 'Create a Service Call',
  description: 'Log warranty callbacks and track issues through resolution.',
  category: 'operations',
  estimatedMinutes: 2,
  availableModes: ['guided', 'self-guided', 'autoplay'],
  steps: [
    {
      id: 'service-issues',
      title: 'Service Issues',
      description: 'Create issues from the desk or portal, assign priority, and close the loop with customers.',
      route: '/app/service-issues',
      target: TOUR_TARGET_IDS.serviceIssuesHub,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 5000,
    },
  ],
};

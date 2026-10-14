import type { YuletideTourDefinition } from '../types';
import { TOUR_TARGET_IDS } from '../config/tour-targets';

/** S1 example tour — navigates dashboard → pipeline. */
export const exampleOverviewTour: YuletideTourDefinition = {
  id: 'example-overview',
  version: 1,
  name: 'Yuletide Overview',
  description: 'A quick look at your command center and sales pipeline.',
  category: 'onboarding',
  estimatedMinutes: 2,
  availableModes: ['guided', 'self-guided', 'autoplay'],
  steps: [
    {
      id: 'dashboard-command-center',
      title: 'Command Center',
      description:
        'Your seasonal operations hub — KPIs, installs, and revenue at a glance.',
      route: '/app',
      target: TOUR_TARGET_IDS.dashboardCommandCenter,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 5000,
    },
    {
      id: 'sales-pipeline',
      title: 'Sales Pipeline',
      description:
        'Track leads through every stage from first contact to booked jobs.',
      route: '/app/pipeline',
      target: TOUR_TARGET_IDS.pipelineBoard,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 5000,
    },
  ],
};

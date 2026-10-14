import type { YuletideTourDefinition } from '../types';
import { TOUR_TARGET_IDS } from '../config/tour-targets';

export const salesPipelineTour: YuletideTourDefinition = {
  id: 'sales-leads-customers',
  version: 1,
  name: 'Leads & Customers',
  description: 'See how your command center and pipeline work together to close more jobs.',
  category: 'sales',
  estimatedMinutes: 3,
  availableModes: ['guided', 'self-guided', 'autoplay'],
  steps: [
    {
      id: 'dashboard',
      title: 'Command Center',
      description: 'KPIs, revenue, and installs in progress — start every day here.',
      route: '/app',
      target: TOUR_TARGET_IDS.dashboardCommandCenter,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 5000,
    },
    {
      id: 'pipeline',
      title: 'Pipeline Board',
      description: 'Track every lead by stage and spot bottlenecks before they cost you revenue.',
      route: '/app/pipeline',
      target: TOUR_TARGET_IDS.pipelineBoard,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 5000,
    },
    {
      id: 'customers',
      title: 'Customer Records',
      description: 'Open any customer for contact info, properties, proposals, and lifetime value.',
      route: '/app/customers',
      target: TOUR_TARGET_IDS.customersList,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 5000,
    },
  ],
};

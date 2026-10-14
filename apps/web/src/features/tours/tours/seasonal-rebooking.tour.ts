import type { YuletideTourDefinition } from '../types';
import { TOUR_TARGET_IDS } from '../config/tour-targets';

export const seasonalRebookingTour: YuletideTourDefinition = {
  id: 'seasonal-rebooking',
  version: 1,
  name: 'Renew Customers',
  description: 'Win back last season\'s customers and manage stored lighting between seasons.',
  category: 'seasonal',
  estimatedMinutes: 3,
  availableModes: ['guided', 'self-guided', 'autoplay'],
  steps: [
    {
      id: 'storage',
      title: 'Customer Storage',
      description: 'After takedown, log bin locations and condition photos for next season\'s pull sheet.',
      route: '/app/storage',
      target: TOUR_TARGET_IDS.storageHub,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 5000,
    },
    {
      id: 'rebooking',
      title: 'Seasonal Rebooking',
      description: 'Run outreach campaigns and track same-design rebooks with revenue forecast.',
      route: '/app/rebooking',
      target: TOUR_TARGET_IDS.rebookingHub,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 5000,
    },
  ],
};

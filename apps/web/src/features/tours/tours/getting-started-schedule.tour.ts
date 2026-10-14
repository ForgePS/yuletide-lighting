import type { YuletideTourDefinition } from '../types';
import { TOUR_TARGET_IDS } from '../config/tour-targets';

export const gettingStartedScheduleTour: YuletideTourDefinition = {
  id: 'getting-started-schedule',
  version: 1,
  name: 'Schedule Your First Installation',
  description: 'Plan installs on the master calendar and track jobs through the pipeline.',
  category: 'onboarding',
  estimatedMinutes: 4,
  availableModes: ['guided', 'self-guided', 'autoplay'],
  steps: [
    {
      id: 'schedule-calendar',
      title: 'Master Calendar',
      description: 'Schedule estimate visits, installs, and removals — drag appointments to reschedule.',
      route: '/app/schedule/calendar',
      target: TOUR_TARGET_IDS.scheduleCalendar,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 5000,
    },
    {
      id: 'jobs-pipeline',
      title: 'Job Pipeline',
      description: 'Accepted proposals become jobs. Move each job from scheduling through install and removal.',
      route: '/app/jobs',
      target: TOUR_TARGET_IDS.jobsPipeline,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 5000,
    },
  ],
};

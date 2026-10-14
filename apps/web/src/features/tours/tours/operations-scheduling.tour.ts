import type { YuletideTourDefinition } from '../types';
import { TOUR_TARGET_IDS } from '../config/tour-targets';

export const operationsSchedulingTour: YuletideTourDefinition = {
  id: 'operations-scheduling',
  version: 1,
  name: 'Installation Scheduling',
  description: 'Coordinate calendar appointments, job stages, and crew assignments.',
  category: 'operations',
  estimatedMinutes: 4,
  availableModes: ['guided', 'self-guided', 'autoplay'],
  steps: [
    {
      id: 'schedule',
      title: 'Master Schedule',
      description: 'Week, month, and agenda views keep installs and removals on track.',
      route: '/app/schedule/calendar',
      target: TOUR_TARGET_IDS.scheduleCalendar,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 5000,
    },
    {
      id: 'jobs',
      title: 'Job Pipeline',
      description: 'Each job moves from accepted proposal through install, removal, and review.',
      route: '/app/jobs',
      target: TOUR_TARGET_IDS.jobsPipeline,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 5000,
    },
    {
      id: 'crew',
      title: 'Crew Operations',
      description: 'Monitor field crews — today\'s jobs, checklist progress, and mobile activity.',
      route: '/app/crew',
      target: TOUR_TARGET_IDS.crewHub,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 5000,
    },
  ],
};

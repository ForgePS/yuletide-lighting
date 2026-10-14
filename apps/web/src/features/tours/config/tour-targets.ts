export const TOUR_TARGET_IDS = {
  dashboardCommandCenter: 'dashboard-command-center',
  dashboardRevenue: 'dashboard-revenue',
  pipelineBoard: 'pipeline-board',
  pipelineHeroCustomer: 'pipeline-hero-customer',
  customersList: 'customers-list',
  customerProfile: 'customer-profile',
  propertyDetail: 'property-detail',
  proposalsHub: 'proposals-hub',
  proposalDetail: 'proposal-detail',
  proposalPresent: 'proposal-present',
  invoicesHub: 'invoices-hub',
  jobsPipeline: 'jobs-pipeline',
  jobsHeroCard: 'jobs-hero-card',
  jobDetail: 'job-detail',
  scheduleCalendar: 'schedule-calendar',
  crewHub: 'crew-hub',
  serviceIssuesHub: 'service-issues-hub',
  storageHub: 'storage-hub',
  rebookingHub: 'rebooking-hub',
  portalProposals: 'portal-proposals',
} as const;

export type TourTargetId = (typeof TOUR_TARGET_IDS)[keyof typeof TOUR_TARGET_IDS];

export const TOUR_TARGETS = {
  dashboardCommandCenter: '[data-tour="dashboard-command-center"]',
  dashboardRevenue: '[data-tour="dashboard-revenue"]',
  pipelineBoard: '[data-tour="pipeline-board"]',
} as const;

export function tourTargetSelector(targetId: string): string {
  return `[data-tour="${targetId}"]`;
}

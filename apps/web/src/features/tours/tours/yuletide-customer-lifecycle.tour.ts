import type { YuletideTourDefinition } from '../types';
import { TOUR_TARGET_IDS } from '../config/tour-targets';

/**
 * YT-TOUR-S4 — Complete Customer Lifecycle
 * Routes use demo fixture placeholders resolved at tour start.
 */
export const yuletideCustomerLifecycleTour: YuletideTourDefinition = {
  id: 'yuletide-customer-lifecycle',
  version: 1,
  name: 'Complete Customer Lifecycle',
  description:
    'Follow John Smith from first lead through install, service, storage, and seasonal rebooking.',
  category: 'overview',
  estimatedMinutes: 12,
  availableModes: ['guided', 'self-guided', 'autoplay'],
  demoOnly: true,
  resilientMode: true,
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to Yuletide',
      description:
        'This guided tour walks a full season with John Smith at 142 Evergreen Drive — from lead to rebook. Use Next to follow along.',
      route: '/app',
      centered: true,
      autoplayDelayMs: 3500,
    },
    {
      id: 'dashboard-command-center',
      title: 'Seasonal Command Center',
      description:
        'Your operations hub — revenue, installs in progress, and what needs attention today.',
      route: '/app',
      target: TOUR_TARGET_IDS.dashboardCommandCenter,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 3000,
    },
    {
      id: 'pipeline-overview',
      title: 'Sales Pipeline',
      description:
        'Every lead moves through stages from first contact to booked work. Demo data fills each column.',
      route: '/app/pipeline',
      target: TOUR_TARGET_IDS.pipelineBoard,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 3000,
    },
    {
      id: 'pipeline-hero',
      title: 'Meet John Smith',
      description:
        'John is our hero customer — proposal sent for a full holiday lighting package at 142 Evergreen Drive.',
      route: '/app/pipeline',
      target: TOUR_TARGET_IDS.pipelineHeroCustomer,
      placement: 'bottom',
      waitForTarget: true,
      optional: true,
      autoplayDelayMs: 3000,
    },
    {
      id: 'customer-profile',
      title: 'Customer 360',
      description:
        'Contact details, pipeline stage, lifetime value, and quick actions live on one profile.',
      route: '/app/customers/{heroCustomerId}',
      target: TOUR_TARGET_IDS.customerProfile,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 3000,
    },
    {
      id: 'property-detail',
      title: 'Property Profile',
      description:
        'Capture install complexity, access notes, hazards, and photos — everything crews need on site.',
      route: '/app/customers/{heroCustomerId}/property/{heroPropertyId}',
      target: TOUR_TARGET_IDS.propertyDetail,
      placement: 'bottom',
      waitForTarget: true,
      optional: true,
      autoplayDelayMs: 3000,
    },
    {
      id: 'proposals-hub',
      title: 'Proposals',
      description:
        'Build scoped packages, pricing, and presentation-ready proposals from property data.',
      route: '/app/proposals',
      target: TOUR_TARGET_IDS.proposalsHub,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 3000,
    },
    {
      id: 'proposal-detail',
      title: 'Proposal Builder',
      description:
        "Review scope, packages, pricing, and send — John's $3,275 package is ready to present.",
      route: '/app/proposals/{heroProposalId}',
      target: TOUR_TARGET_IDS.proposalDetail,
      placement: 'bottom',
      waitForTarget: true,
      optional: true,
      autoplayDelayMs: 3000,
    },
    {
      id: 'proposal-present',
      title: 'Presentation Mode',
      description:
        'Walk homeowners through packages on a clean, full-screen presentation — no CRM clutter.',
      route: '/app/proposals/{heroProposalId}/present',
      target: TOUR_TARGET_IDS.proposalPresent,
      placement: 'bottom',
      waitForTarget: true,
      optional: true,
      autoplayDelayMs: 3000,
    },
    {
      id: 'customer-portal',
      title: 'Customer Portal',
      description:
        'Homeowners review proposals, approve designs, and pay deposits in a branded portal — separate from your CRM view.',
      route: '/portal/{heroPortalAccessToken}/proposals',
      target: TOUR_TARGET_IDS.portalProposals,
      placement: 'bottom',
      waitForTarget: true,
      optional: true,
      autoplayDelayMs: 3000,
    },
    {
      id: 'invoices-deposit',
      title: 'Deposits & Invoicing',
      description:
        "Track deposits, balances, and collections — John's 50% deposit invoice is on the AR dashboard.",
      route: '/app/invoices/dashboard',
      target: TOUR_TARGET_IDS.invoicesHub,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 3000,
    },
    {
      id: 'jobs-pipeline',
      title: 'Job Pipeline',
      description:
        'Accepted proposals become jobs — move from scheduling through install, removal, and review.',
      route: '/app/jobs',
      target: TOUR_TARGET_IDS.jobsPipeline,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 3000,
    },
    {
      id: 'jobs-hero',
      title: "John's Install Job",
      description:
        "John's job is scheduled and ready for crew assignment — open it for install details and materials.",
      route: '/app/jobs',
      target: TOUR_TARGET_IDS.jobsHeroCard,
      placement: 'right',
      waitForTarget: true,
      optional: true,
      autoplayDelayMs: 3000,
    },
    {
      id: 'job-detail',
      title: 'Install Progress',
      description:
        'Crews reserve inventory, complete checklists, and upload photos as the install progresses.',
      route: '/app/jobs/{heroJobId}',
      target: TOUR_TARGET_IDS.jobDetail,
      placement: 'bottom',
      waitForTarget: true,
      optional: true,
      autoplayDelayMs: 3000,
    },
    {
      id: 'schedule-calendar',
      title: 'Master Schedule',
      description:
        'Plan estimate visits, installs, and removals across crews on one calendar.',
      route: '/app/schedule/calendar',
      target: TOUR_TARGET_IDS.scheduleCalendar,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 3000,
    },
    {
      id: 'crew-operations',
      title: 'Crew Operations',
      description:
        "Monitor today's field work — job progress, checklists, and mobile activity.",
      route: '/app/crew',
      target: TOUR_TARGET_IDS.crewHub,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 3000,
    },
    {
      id: 'service-issues',
      title: 'Service & Warranty',
      description:
        "Track callbacks and warranty repairs — a demo issue is open for John's north roofline.",
      route: '/app/service-issues',
      target: TOUR_TARGET_IDS.serviceIssuesHub,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 3000,
    },
    {
      id: 'storage-hub',
      title: 'Season-End Storage',
      description:
        'After takedown, log bin locations, condition photos, and pull sheets for next season.',
      route: '/app/storage',
      target: TOUR_TARGET_IDS.storageHub,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 3000,
    },
    {
      id: 'rebooking-hub',
      title: 'Seasonal Rebooking',
      description:
        "Win back last season's customers with outreach campaigns and same-design rebooks.",
      route: '/app/rebooking',
      target: TOUR_TARGET_IDS.rebookingHub,
      placement: 'bottom',
      waitForTarget: true,
      autoplayDelayMs: 3000,
    },
    {
      id: 'lifecycle-complete',
      title: "You've Seen the Full Lifecycle",
      description:
        'From lead to rebook — Yuletide connects sales, operations, and service in one platform. Explore freely or restart the tour anytime from Help.',
      route: '/app',
      centered: true,
      autoplayDelayMs: 4000,
    },
  ],
};

import type { YuletideTourDefinition } from '../types';
import { exampleOverviewTour } from '../tours/example-overview.tour';
import { yuletideCustomerLifecycleTour } from '../tours/yuletide-customer-lifecycle.tour';
import { gettingStartedFirstCustomerTour } from '../tours/getting-started-first-customer.tour';
import { gettingStartedProposalTour } from '../tours/getting-started-proposal.tour';
import { gettingStartedScheduleTour } from '../tours/getting-started-schedule.tour';
import { salesPipelineTour } from '../tours/sales-pipeline.tour';
import { salesProposalsTour } from '../tours/sales-proposals.tour';
import { operationsSchedulingTour } from '../tours/operations-scheduling.tour';
import { operationsServiceTour } from '../tours/operations-service.tour';
import { seasonalRebookingTour } from '../tours/seasonal-rebooking.tour';

const registry = new Map<string, YuletideTourDefinition>();

function registerTour(tour: YuletideTourDefinition): void {
  registry.set(tour.id, tour);
}

registerTour(exampleOverviewTour);
registerTour(yuletideCustomerLifecycleTour);
registerTour(gettingStartedFirstCustomerTour);
registerTour(gettingStartedProposalTour);
registerTour(gettingStartedScheduleTour);
registerTour(salesPipelineTour);
registerTour(salesProposalsTour);
registerTour(operationsSchedulingTour);
registerTour(operationsServiceTour);
registerTour(seasonalRebookingTour);

export const TourRegistry = {
  get(id: string): YuletideTourDefinition | undefined {
    return registry.get(id);
  },

  list(): YuletideTourDefinition[] {
    return Array.from(registry.values());
  },

  register(tour: YuletideTourDefinition): void {
    registerTour(tour);
  },
};

export {
  exampleOverviewTour,
  yuletideCustomerLifecycleTour,
  gettingStartedFirstCustomerTour,
  gettingStartedProposalTour,
  gettingStartedScheduleTour,
  salesPipelineTour,
  salesProposalsTour,
  operationsSchedulingTour,
  operationsServiceTour,
  seasonalRebookingTour,
};

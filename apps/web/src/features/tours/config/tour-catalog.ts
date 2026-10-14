import type { TourCategory, YuletideTourDefinition } from '../types';

export const TOUR_CATEGORY_ORDER: TourCategory[] = [
  'onboarding',
  'overview',
  'sales',
  'operations',
  'seasonal',
  'administration',
];

export const TOUR_CATEGORY_LABELS: Record<TourCategory, string> = {
  onboarding: 'Getting Started',
  overview: 'Overview',
  sales: 'Sales',
  operations: 'Operations',
  seasonal: 'Seasonal',
  administration: 'Administration',
};

export function groupToursByCategory(tours: YuletideTourDefinition[]): Map<TourCategory, YuletideTourDefinition[]> {
  const grouped = new Map<TourCategory, YuletideTourDefinition[]>();
  for (const category of TOUR_CATEGORY_ORDER) {
    grouped.set(category, []);
  }
  for (const tour of tours) {
    const list = grouped.get(tour.category) ?? [];
    list.push(tour);
    grouped.set(tour.category, list);
  }
  return grouped;
}

export function filterTours(tours: YuletideTourDefinition[], query: string): YuletideTourDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return tours;
  return tours.filter((tour) => {
    const categoryLabel = TOUR_CATEGORY_LABELS[tour.category].toLowerCase();
    return (
      tour.name.toLowerCase().includes(q)
      || tour.description.toLowerCase().includes(q)
      || tour.category.toLowerCase().includes(q)
      || categoryLabel.includes(q)
    );
  });
}

export function isTourAvailableForTenant(
  tour: YuletideTourDefinition,
  isDemoTenant: boolean,
): boolean {
  if (tour.demoOnly && !isDemoTenant) return false;
  return true;
}

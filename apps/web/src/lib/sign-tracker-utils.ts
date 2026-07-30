import type { SignLocationStatus, SignPlacementType } from '@clcrm/types';

export const MARKETING_NAV = [
  { href: '/app/marketing/sign-tracker', label: 'Sign Tracker' },
  { href: '/app/marketing/sign-tracker/pickup', label: 'Pickup Mode' },
  { href: '/app/marketing/sign-tracker/report', label: 'Campaign Report' },
];

export const PLACEMENT_TYPE_LABELS: Record<SignPlacementType, string> = {
  customer_yard: 'Customer Yard',
  roadside: 'Roadside',
  intersection: 'Intersection',
  subdivision_entrance: 'Subdivision Entrance',
  commercial_property: 'Commercial Property',
  other: 'Other',
};

export const STATUS_LABELS: Record<SignLocationStatus, string> = {
  active: 'Active',
  needs_pickup: 'Needs Pickup',
  picked_up: 'Picked Up',
  partially_recovered: 'Partially Recovered',
  missing: 'Missing',
  removed: 'Removed',
};

export const STATUS_COLORS: Record<SignLocationStatus, string> = {
  active: '#22c55e',
  needs_pickup: '#eab308',
  picked_up: '#3b82f6',
  partially_recovered: '#f97316',
  missing: '#ef4444',
  removed: '#ef4444',
};

export const STATUS_BADGE_CLASSES: Record<SignLocationStatus, string> = {
  active: 'bg-green-100 text-green-800',
  needs_pickup: 'bg-yellow-100 text-yellow-800',
  picked_up: 'bg-blue-100 text-blue-800',
  partially_recovered: 'bg-orange-100 text-orange-800',
  missing: 'bg-red-100 text-red-800',
  removed: 'bg-red-100 text-red-800',
};

export function currentSeasonYear(): number {
  const now = new Date();
  return now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
}

export const SEASON_OPTIONS = [currentSeasonYear(), currentSeasonYear() - 1, currentSeasonYear() - 2];

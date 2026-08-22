import type { SettingsRole } from '@clcrm/types';

export const FIELD_ROLES = new Set<SettingsRole>(['installer', 'crew_leader', 'warehouse_staff']);

export const FIELD_NAV = [
  { href: '/app/field', label: 'Today', icon: 'calendar' as const, exact: true },
  { href: '/app/field/signs', label: 'Signs', icon: 'megaphone' as const },
  { href: '/app/field/signs/pickup', label: 'Pickup', icon: 'map-pin' as const },
  { href: '/app/field/time', label: 'Time', icon: 'clock' as const },
] as const;

export function defaultAppHome(
  me?: { isFieldOnly?: boolean; isFieldUser?: boolean; canAccessOfficeCrm?: boolean } | null,
) {
  if (me?.isFieldOnly) return '/app/field';
  if (me?.isFieldUser && !me?.canAccessOfficeCrm) return '/app/field';
  return '/app';
}

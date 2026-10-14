import { tourTargetSelector } from '../config/tour-targets';

export function resolveTourTargetSelector(targetId: string | undefined): string | null {
  if (!targetId?.trim()) return null;
  return tourTargetSelector(targetId.trim());
}

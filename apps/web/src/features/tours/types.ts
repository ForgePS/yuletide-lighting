export type TourMode = 'guided' | 'autoplay' | 'self-guided' | 'onboarding';

export type TourCategory =
  | 'overview'
  | 'sales'
  | 'operations'
  | 'administration'
  | 'seasonal'
  | 'onboarding';

export type TourPlacement = 'top' | 'right' | 'bottom' | 'left' | 'center';

export type TourStatus = 'idle' | 'playing' | 'paused' | 'missing-target';

export interface YuletideTourStep {
  id: string;
  title: string;
  description: string;
  /** Optional spoken script override for autoplay / narration. */
  narration?: string;
  /** When true, skip voice narration for this step. */
  muteNarration?: boolean;
  route?: string;
  /** Stable `data-tour` id — not a CSS selector. */
  target?: string;
  placement?: TourPlacement;
  autoplayDelayMs?: number;
  interactive?: boolean;
  optional?: boolean;
  /** Centered modal step with no DOM highlight target (welcome/summary). */
  centered?: boolean;
  waitForTarget?: boolean;
  beforeEnter?: string;
  afterComplete?: string;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  demoOnly?: boolean;
}

export interface YuletideTourDefinition {
  id: string;
  version: number;
  name: string;
  description: string;
  category: TourCategory;
  estimatedMinutes?: number;
  availableModes: TourMode[];
  steps: YuletideTourStep[];
  /** When true, tour is only offered in the demo tenant (fixture-dependent routes). */
  demoOnly?: boolean;
  /** When true, missing routes/targets auto-skip instead of blocking the tour. */
  resilientMode?: boolean;
}

export interface TourProgressState {
  tourId: string;
  tourVersion: number;
  stepIndex: number;
  mode: TourMode;
  startedAt: string;
  updatedAt: string;
}

export interface TourTargetMissingPayload {
  tourId: string;
  stepId: string;
  route: string;
  target: string | null;
}

export type TourAnalyticsEvent =
  | { type: 'tour_started'; tourId: string; mode: TourMode; timestamp: string }
  | { type: 'tour_completed'; tourId: string; timestamp: string }
  | { type: 'tour_exited'; tourId: string; stepIndex: number; timestamp: string }
  | { type: 'tour_step_viewed'; tourId: string; stepId: string; stepIndex: number; timestamp: string }
  | { type: 'tour_target_missing'; tourId: string; stepId: string; route: string; target: string | null; timestamp: string };

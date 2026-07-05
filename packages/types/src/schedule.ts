/** Enterprise Scheduling — Sprint SCH-001 */

export type ScheduleAuditFields = {
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type AppointmentType =
  | 'estimate_visit'
  | 'design_consultation'
  | 'installation'
  | 'takedown'
  | 'service_call'
  | 'warranty_repair'
  | 'storage_retrieval'
  | 'storage_intake'
  | 'commercial_project'
  | 'permanent_lighting_install'
  | 'internal_meeting';

export type EventCategory =
  | 'installation'
  | 'takedown'
  | 'estimate'
  | 'service_call'
  | 'warranty'
  | 'commercial'
  | 'permanent_lighting'
  | 'internal_event';

export type DispatchStatus =
  | 'scheduled'
  | 'en_route'
  | 'arrived'
  | 'working'
  | 'completed'
  | 'delayed';

export type CrewAvailabilityStatus =
  | 'available'
  | 'assigned'
  | 'vacation'
  | 'sick_leave'
  | 'training'
  | 'off_duty';

export type ConflictType = 'crew' | 'vehicle' | 'customer' | 'property' | 'overlap' | 'resource';

export type HolidayEventType =
  | 'christmas'
  | 'halloween'
  | 'fourth_of_july'
  | 'valentines'
  | 'st_patricks'
  | 'custom';

export type SeasonPhase =
  | 'august_sales'
  | 'september_design'
  | 'october_install'
  | 'november_peak'
  | 'january_takedown'
  | 'february_storage';

export type CalendarEvent = ScheduleAuditFields & {
  id: string;
  organizationId: string;
  title: string;
  appointmentType: AppointmentType;
  category: EventCategory;
  customerId?: string | null;
  customerName?: string | null;
  propertyId?: string | null;
  propertyAddress?: string | null;
  jobId?: string | null;
  proposalId?: string | null;
  crewId?: string | null;
  crewName?: string | null;
  vehicleId?: string | null;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  color: string;
  notes?: string | null;
  dispatchStatus: DispatchStatus;
  estimatedRevenueCents: number;
  weatherRisk: boolean;
  holidayEventType?: HolidayEventType | null;
};

export type CrewProfile = ScheduleAuditFields & {
  id: string;
  organizationId: string;
  name: string;
  position: string;
  certifications: string[];
  skillLevel: 'junior' | 'mid' | 'senior' | 'lead';
  availabilityStatus: CrewAvailabilityStatus;
  assignedVehicleId?: string | null;
  leaderUserId?: string | null;
  memberUserIds: string[];
  isActive: boolean;
  scheduledHoursWeek: number;
  availableHoursWeek: number;
  utilizationPercent: number;
};

export type VehicleSchedule = ScheduleAuditFields & {
  id: string;
  organizationId: string;
  name: string;
  vehicleType: 'install_truck' | 'service_truck' | 'lift_equipment' | 'trailer';
  assignedCrewId?: string | null;
  isAvailable: boolean;
  maintenanceNotes?: string | null;
};

export type RoutePlan = ScheduleAuditFields & {
  id: string;
  organizationId: string;
  routeDate: Date;
  crewId?: string | null;
  crewName?: string | null;
  stops: Array<{
    id: string;
    eventId: string;
    customerName?: string | null;
    address?: string | null;
    arrivalAt?: Date | null;
    travelMinutes: number;
    order: number;
  }>;
  totalDistanceMiles: number;
  totalTravelMinutes: number;
  efficiencyScore: number;
};

export type DispatchBoardEntry = ScheduleAuditFields & {
  id: string;
  organizationId: string;
  crewId: string;
  crewName: string;
  currentEventId?: string | null;
  currentJobTitle?: string | null;
  nextEventId?: string | null;
  nextJobTitle?: string | null;
  eta?: Date | null;
  status: DispatchStatus;
  routePosition?: number | null;
  completionPercent: number;
};

export type ScheduleTemplate = ScheduleAuditFields & {
  id: string;
  organizationId: string;
  name: string;
  appointmentType: AppointmentType;
  estimatedLaborHours: number;
  crewSize: number;
  equipmentRequired: string[];
  vehicleRequirements: string[];
  isActive: boolean;
};

export type ResourceReservation = ScheduleAuditFields & {
  id: string;
  organizationId: string;
  resourceName: string;
  resourceType: 'lift' | 'trailer' | 'equipment' | 'decoration';
  eventId: string;
  startAt: Date;
  endAt: Date;
};

export type ScheduleConflict = {
  id: string;
  type: ConflictType;
  severity: 'warning' | 'error';
  message: string;
  eventIds: string[];
  suggestion?: string | null;
};

export type SeasonPlanEntry = {
  phase: SeasonPhase;
  label: string;
  month: string;
  projectedJobs: number;
  projectedRevenueCents: number;
  capacityPercent: number;
};

export type ScheduleDashboardKpis = {
  jobsScheduledToday: number;
  estimatesScheduled: number;
  installationsScheduled: number;
  serviceCallsScheduled: number;
  takedownsScheduled: number;
  openTimeSlots: number;
  crewUtilizationPercent: number;
  routeEfficiencyScore: number;
  revenueScheduledCents: number;
  capacityRemainingPercent: number;
};

export type ScheduleAnalytics = {
  capacityUtilizationPercent: number;
  crewProductivityScore: number;
  scheduleEfficiencyPercent: number;
  onTimeArrivalPercent: number;
  routePerformanceScore: number;
  revenuePerCrewCents: number;
  revenuePerDayCents: number;
};

export type WeatherForecast = {
  date: Date;
  condition: string;
  rainProbability: number;
  windSpeedMph: number;
  temperatureF: number;
  riskLevel: 'low' | 'medium' | 'high';
};

export type AiSchedulingResult = {
  answer: string;
  events: CalendarEvent[];
  recommendations: string[];
};

export const EVENT_CATEGORY_COLORS: Record<EventCategory, string> = {
  installation: '#DC2626',
  takedown: '#F59E0B',
  estimate: '#3B82F6',
  service_call: '#8B5CF6',
  warranty: '#EC4899',
  commercial: '#059669',
  permanent_lighting: '#0EA5E9',
  internal_event: '#6B7280',
};

export const APPOINTMENT_TO_CATEGORY: Record<AppointmentType, EventCategory> = {
  estimate_visit: 'estimate',
  design_consultation: 'estimate',
  installation: 'installation',
  takedown: 'takedown',
  service_call: 'service_call',
  warranty_repair: 'warranty',
  storage_retrieval: 'service_call',
  storage_intake: 'service_call',
  commercial_project: 'commercial',
  permanent_lighting_install: 'permanent_lighting',
  internal_meeting: 'internal_event',
};

export const DEFAULT_SCHEDULE_TEMPLATES: Array<Omit<ScheduleTemplate, keyof ScheduleAuditFields | 'id' | 'organizationId'>> = [
  { name: 'Standard roofline install', appointmentType: 'installation', estimatedLaborHours: 4, crewSize: 2, equipmentRequired: ['Ladder', 'Clips'], vehicleRequirements: ['Install Truck'], isActive: true },
  { name: 'Large residential install', appointmentType: 'installation', estimatedLaborHours: 8, crewSize: 3, equipmentRequired: ['Ladder', 'Lift'], vehicleRequirements: ['Install Truck', 'Lift Equipment'], isActive: true },
  { name: 'Commercial install', appointmentType: 'commercial_project', estimatedLaborHours: 16, crewSize: 4, equipmentRequired: ['Lift', 'Commercial displays'], vehicleRequirements: ['Install Truck', 'Trailer'], isActive: true },
  { name: 'Service call', appointmentType: 'service_call', estimatedLaborHours: 2, crewSize: 1, equipmentRequired: ['Tools', 'Replacement bulbs'], vehicleRequirements: ['Service Truck'], isActive: true },
  { name: 'Takedown', appointmentType: 'takedown', estimatedLaborHours: 3, crewSize: 2, equipmentRequired: ['Ladder'], vehicleRequirements: ['Install Truck'], isActive: true },
];

export const DEFAULT_CREWS: Array<Omit<CrewProfile, keyof ScheduleAuditFields | 'id' | 'organizationId' | 'scheduledHoursWeek' | 'availableHoursWeek' | 'utilizationPercent'>> = [
  { name: 'Install Crew A', position: 'Installer', certifications: ['Ladder Safety'], skillLevel: 'senior', availabilityStatus: 'available', assignedVehicleId: null, leaderUserId: null, memberUserIds: [], isActive: true },
  { name: 'Install Crew B', position: 'Installer', certifications: ['Ladder Safety'], skillLevel: 'mid', availabilityStatus: 'available', assignedVehicleId: null, leaderUserId: null, memberUserIds: [], isActive: true },
  { name: 'Service Crew', position: 'Technician', certifications: ['Electrical Basics'], skillLevel: 'mid', availabilityStatus: 'available', assignedVehicleId: null, leaderUserId: null, memberUserIds: [], isActive: true },
];

export const DEFAULT_VEHICLES: Array<Omit<VehicleSchedule, keyof ScheduleAuditFields | 'id' | 'organizationId'>> = [
  { name: 'Install Truck 1', vehicleType: 'install_truck', assignedCrewId: null, isAvailable: true, maintenanceNotes: null },
  { name: 'Service Truck 2', vehicleType: 'service_truck', assignedCrewId: null, isAvailable: true, maintenanceNotes: null },
  { name: 'Lift Equipment', vehicleType: 'lift_equipment', assignedCrewId: null, isAvailable: true, maintenanceNotes: null },
  { name: 'Equipment Trailer', vehicleType: 'trailer', assignedCrewId: null, isAvailable: true, maintenanceNotes: null },
];

export const SEASON_PLAN: SeasonPlanEntry[] = [
  { phase: 'august_sales', label: 'Sales Season', month: 'August', projectedJobs: 40, projectedRevenueCents: 8000000, capacityPercent: 30 },
  { phase: 'september_design', label: 'Design Season', month: 'September', projectedJobs: 60, projectedRevenueCents: 12000000, capacityPercent: 45 },
  { phase: 'october_install', label: 'Installation Season', month: 'October', projectedJobs: 80, projectedRevenueCents: 16000000, capacityPercent: 70 },
  { phase: 'november_peak', label: 'Peak Installation', month: 'November', projectedJobs: 100, projectedRevenueCents: 20000000, capacityPercent: 95 },
  { phase: 'january_takedown', label: 'Takedown Season', month: 'January', projectedJobs: 70, projectedRevenueCents: 7000000, capacityPercent: 60 },
  { phase: 'february_storage', label: 'Storage Processing', month: 'February', projectedJobs: 30, projectedRevenueCents: 3000000, capacityPercent: 35 },
];

export function appointmentDurationHours(type: AppointmentType): number {
  const map: Partial<Record<AppointmentType, number>> = {
    estimate_visit: 1, design_consultation: 1.5, installation: 4, takedown: 3,
    service_call: 2, warranty_repair: 2, commercial_project: 8, permanent_lighting_install: 6,
    internal_meeting: 1,
  };
  return map[type] ?? 2;
}

export function detectConflicts(
  events: CalendarEvent[],
  newEvent: Pick<CalendarEvent, 'id' | 'crewId' | 'vehicleId' | 'customerId' | 'propertyId' | 'startAt' | 'endAt'>,
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const overlaps = (a: { startAt: Date; endAt: Date }, b: { startAt: Date; endAt: Date }) =>
    a.startAt < b.endAt && a.endAt > b.startAt;

  for (const e of events.filter((x) => x.id !== newEvent.id)) {
    if (!overlaps(e, newEvent)) continue;
    if (newEvent.crewId && e.crewId === newEvent.crewId) {
      conflicts.push({ id: `crew-${e.id}`, type: 'crew', severity: 'error', message: `Crew conflict with "${e.title}"`, eventIds: [e.id, newEvent.id], suggestion: 'Assign a different crew or reschedule' });
    }
    if (newEvent.vehicleId && e.vehicleId === newEvent.vehicleId) {
      conflicts.push({ id: `vehicle-${e.id}`, type: 'vehicle', severity: 'error', message: `Vehicle conflict with "${e.title}"`, eventIds: [e.id, newEvent.id], suggestion: 'Use a different vehicle' });
    }
    if (newEvent.customerId && e.customerId === newEvent.customerId) {
      conflicts.push({ id: `customer-${e.id}`, type: 'customer', severity: 'warning', message: `Customer has overlapping appointment "${e.title}"`, eventIds: [e.id, newEvent.id] });
    }
    if (newEvent.propertyId && e.propertyId === newEvent.propertyId) {
      conflicts.push({ id: `property-${e.id}`, type: 'property', severity: 'warning', message: `Property conflict with "${e.title}"`, eventIds: [e.id, newEvent.id] });
    }
  }
  return conflicts;
}

export function aiSchedulingQuery(question: string, events: CalendarEvent[], crews: CrewProfile[]): AiSchedulingResult {
  const q = question.toLowerCase();
  let filtered = events;
  const recommendations: string[] = [];

  if (q.includes('available crew') || q.includes('available crews')) {
    const busyCrewIds = new Set(events.filter((e) => e.crewId).map((e) => e.crewId!));
    const available = crews.filter((c) => !busyCrewIds.has(c.id) && c.availabilityStatus === 'available');
    recommendations.push(`${available.length} crew(s) available: ${available.map((c) => c.name).join(', ') || 'none'}`);
    filtered = events.filter((e) => e.crewId && !busyCrewIds.has(e.crewId));
  } else if (q.includes('overloaded') || q.includes('overloaded crew')) {
    const counts = new Map<string, number>();
    for (const e of events) if (e.crewId) counts.set(e.crewId, (counts.get(e.crewId) ?? 0) + 1);
    const overloaded = [...counts.entries()].filter(([, c]) => c >= 3).map(([id]) => id);
    filtered = events.filter((e) => e.crewId && overloaded.includes(e.crewId));
    recommendations.push('Consider redistributing jobs from crews with 3+ appointments');
  } else if (q.includes('optimize') && q.includes('route')) {
    recommendations.push('Reorder stops by geographic proximity', 'Assign dedicated service truck for east-side cluster');
    filtered = events.filter((e) => e.category === 'installation' || e.category === 'service_call');
  } else if (q.includes('capacity') && q.includes('october')) {
    recommendations.push('October projected at 70% capacity — room for ~24 additional installs', 'Consider adding temporary crew for peak weeks');
    filtered = events.filter((e) => e.startAt.getMonth() === 9);
  } else if (q.includes('next week') || q.includes('additional install')) {
    filtered = events.filter((e) => e.category === 'installation');
    recommendations.push('Review open slots on Tuesday and Thursday afternoons');
  }

  return { answer: `Found ${filtered.length} relevant schedule item(s) for "${question}".`, events: filtered.slice(0, 20), recommendations };
}

export function mockWeatherForecast(days = 5): WeatherForecast[] {
  const forecasts: WeatherForecast[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const rain = Math.round(Math.random() * 80);
    const wind = Math.round(5 + Math.random() * 25);
    forecasts.push({
      date,
      condition: rain > 50 ? 'Rain likely' : wind > 20 ? 'Windy' : 'Clear',
      rainProbability: rain,
      windSpeedMph: wind,
      temperatureF: Math.round(35 + Math.random() * 30),
      riskLevel: rain > 60 || wind > 25 ? 'high' : rain > 30 ? 'medium' : 'low',
    });
  }
  return forecasts;
}

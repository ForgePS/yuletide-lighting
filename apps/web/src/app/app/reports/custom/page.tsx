import { CustomDashboardBuilder, AIAnalyticsAssistant, ScheduledReportsManager } from '@/components/reports';

export default function Page() {
  return (
    <div className="space-y-8">
      <CustomDashboardBuilder />
      <AIAnalyticsAssistant />
      <ScheduledReportsManager />
    </div>
  );
}

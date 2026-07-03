import { RebookingDashboard } from '@/components/rebooking';

export default function RebookingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Seasonal rebooking</h1>
        <p className="text-muted-foreground">
          Win back last season&apos;s customers — track outreach, same-design rebooks, and revenue forecast.
        </p>
      </div>
      <RebookingDashboard />
    </div>
  );
}

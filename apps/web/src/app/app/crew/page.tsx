import { CrewDashboard } from '@/components/crew';

export default function CrewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Crew operations</h1>
        <p className="text-muted-foreground">
          Monitor field crews — today&apos;s jobs, checklist progress, photos, and activity from mobile.
        </p>
      </div>
      <CrewDashboard />
    </div>
  );
}

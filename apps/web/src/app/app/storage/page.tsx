import { StorageDashboard } from '@/components/storage';

export default function StoragePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Customer storage</h1>
        <p className="text-muted-foreground">
          Track stored lighting after takedown — bin locations, condition photos, and pull sheets for next season.
        </p>
      </div>
      <StorageDashboard />
    </div>
  );
}

import { AddSignLocationForm } from '@/components/sign-tracker';

export default function AddSignLocationPage() {
  return (
    <div>
      <h2 className="text-lg font-semibold">Add Sign Location</h2>
      <p className="mt-1 text-sm text-muted-foreground">Drop a pin in under 10 seconds — GPS auto-captures your location.</p>
      <div className="mt-6">
        <AddSignLocationForm />
      </div>
    </div>
  );
}

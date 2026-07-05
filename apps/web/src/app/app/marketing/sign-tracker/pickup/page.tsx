import { SignPickupMode } from '@/components/sign-tracker';

export default function SignPickupPage() {
  return (
    <div>
      <h2 className="text-lg font-semibold">Sign Pickup Mode</h2>
      <p className="mt-1 text-sm text-muted-foreground">Route-optimized list of active signs — closest first.</p>
      <div className="mt-6">
        <SignPickupMode />
      </div>
    </div>
  );
}

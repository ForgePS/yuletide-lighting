import { SignPickupMode } from "@/components/sign-tracker/sign-pickup-mode";

export default function FieldSignPickupPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Sign pickup</h1>
        <p className="text-sm text-slate-500">Scan signs as you load the truck.</p>
      </div>
      <SignPickupMode />
    </div>
  );
}

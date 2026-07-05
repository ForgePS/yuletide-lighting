import { AddSignLocationForm } from "@/components/sign-tracker/add-sign-location-form";

export default function FieldAddSignPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Add sign</h1>
        <p className="text-sm text-slate-500">Register a new yard sign location.</p>
      </div>
      <AddSignLocationForm />
    </div>
  );
}

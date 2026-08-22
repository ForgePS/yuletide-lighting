'use client';

import Link from 'next/link';
import { MapPin, Package, AlertTriangle } from 'lucide-react';

/** Mobile-oriented hub that links to canonical Sign Tracker routes. */
export function FieldSignsHub() {
  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Sign Tracker</h1>
        <p className="text-sm text-slate-500">Field shortcuts for yard sign placement and pickup.</p>
      </div>
      <div className="space-y-3">
        <Link href="/app/marketing/sign-tracker/pickup" className="card flex items-center gap-4 p-4 active:scale-[0.99]">
          <Package className="h-6 w-6 text-teal-700" />
          <div>
            <p className="font-semibold">Sign pickup</p>
            <p className="text-xs text-muted-foreground">Recover signs by proximity</p>
          </div>
        </Link>
        <Link href="/app/marketing/sign-tracker/add" className="card flex items-center gap-4 p-4 active:scale-[0.99]">
          <MapPin className="h-6 w-6 text-teal-700" />
          <div>
            <p className="font-semibold">Add sign location</p>
            <p className="text-xs text-muted-foreground">Place a new yard sign</p>
          </div>
        </Link>
        <Link href="/app/marketing/sign-tracker/report" className="card flex items-center gap-4 p-4 active:scale-[0.99]">
          <AlertTriangle className="h-6 w-6 text-teal-700" />
          <div>
            <p className="font-semibold">Campaign report</p>
            <p className="text-xs text-muted-foreground">Recovery rates and status breakdown</p>
          </div>
        </Link>
        <Link href="/app/marketing/sign-tracker" className="btn-secondary block w-full py-3 text-center">
          Open Sign Tracker dashboard
        </Link>
      </div>
    </div>
  );
}

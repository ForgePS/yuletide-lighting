'use client';

import Link from 'next/link';
import { Megaphone, MapPin, PlusCircle } from 'lucide-react';

export function FieldSignsHub() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Marketing signs</h1>
        <p className="text-sm text-muted-foreground">Track yard signs and pickup routes</p>
      </div>

      <div className="grid gap-3">
        <Link href="/app/field/signs/pickup" className="card flex items-center gap-4 p-4 active:scale-[0.99]">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MapPin className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold">Sign pickup</p>
            <p className="text-sm text-muted-foreground">GPS route — closest signs first</p>
          </div>
        </Link>

        <Link href="/app/field/signs/add" className="card flex items-center gap-4 p-4 active:scale-[0.99]">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
            <PlusCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold">Add sign location</p>
            <p className="text-sm text-muted-foreground">GPS + photo at install</p>
          </div>
        </Link>

        <Link href="/app/field/signs/report" className="card flex items-center gap-4 p-4 active:scale-[0.99]">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
            <Megaphone className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold">Report sign issue</p>
            <p className="text-sm text-muted-foreground">Damaged, missing, or stolen signs</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

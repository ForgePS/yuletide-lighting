'use client';

import Link from 'next/link';
import { resolveMapboxPublicToken } from '@/lib/mapbox-env';
import { useEffect, useState } from 'react';

/** Intentional empty state when Mapbox is not configured. */
export function MapUnavailable({
  className = 'h-[320px] w-full rounded-xl',
  message = 'Map unavailable — add a public Mapbox token (NEXT_PUBLIC_MAPBOX_TOKEN) for this environment.',
}: {
  className?: string;
  message?: string;
}) {
  return (
    <div
      className={`${className} flex flex-col items-center justify-center gap-2 bg-muted px-4 text-center text-sm text-muted-foreground`}
      role="status"
    >
      <p>{message}</p>
      <p className="text-xs">Maps never use a secret Mapbox token in the browser.</p>
    </div>
  );
}

export function useMapboxTokenReady() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    resolveMapboxPublicToken().then((t) => {
      if (!cancelled) setToken(t);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return { token, loading: token === undefined, available: Boolean(token) };
}

export function SignTrackerRecordLink({ locationId, children }: { locationId: string; children: React.ReactNode }) {
  return (
    <Link href={`/app/marketing/sign-tracker?locationId=${encodeURIComponent(locationId)}`} className="text-primary hover:underline">
      {children}
    </Link>
  );
}

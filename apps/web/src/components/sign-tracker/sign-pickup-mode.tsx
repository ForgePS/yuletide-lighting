'use client';

import { useEffect, useState } from 'react';
import type { SignPickupLocation } from '@clcrm/types';
import { trpc } from '@/lib/trpc';
import { LoadingState } from '@/components/ui/states';
import { SignLocationDetail } from './sign-location-detail';
import { currentSeasonYear } from '@/lib/sign-tracker-utils';
import { Navigation, MapPin } from 'lucide-react';

export function SignPickupMode() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selected, setSelected] = useState<SignPickupLocation | null>(null);
  const seasonYear = currentSeasonYear();

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords({ lat: 35.0, lng: -90.0 }),
      { enableHighAccuracy: true },
    );
  }, []);

  const { data, isLoading, refetch } = trpc.signTracker360.pickupRoute.useQuery(
    { latitude: coords?.lat ?? 0, longitude: coords?.lng ?? 0, seasonYear },
    { enabled: !!coords },
  );
  const utils = trpc.useUtils();

  if (!coords || isLoading) return <LoadingState message="Finding active signs near you..." />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {data?.length ?? 0} active sign locations — sorted closest first
      </p>

      {!data?.length ? (
        <div className="card p-8 text-center">
          <MapPin className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium">No active signs to pick up</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((loc, i) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => setSelected(loc)}
              className="card w-full p-4 text-left transition-all hover:border-primary"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">#{i + 1}</p>
                  <p className="font-semibold">{loc.location.address || loc.location.neighborhood || 'Sign location'}</p>
                  <p className="text-sm text-muted-foreground">{loc.location.city}</p>
                  <p className="mt-1 text-sm">{loc.signData.quantityPlaced} signs placed</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-primary">{loc.distanceMiles.toFixed(1)} mi</p>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${loc.location.latitude},${loc.location.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary mt-2 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Navigation className="h-3 w-3" /> Navigate
                  </a>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <SignLocationDetail
          location={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => {
            refetch();
            utils.signTracker360.dashboard.invalidate();
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

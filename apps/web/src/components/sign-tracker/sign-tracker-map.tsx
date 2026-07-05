'use client';

import { useEffect, useRef, useState } from 'react';
import type { SignLocation } from '@clcrm/types';
import { STATUS_COLORS } from '@/lib/sign-tracker-utils';

type SignTrackerMapProps = {
  locations: SignLocation[];
  selectedCity?: string | null;
  onSelectLocation?: (location: SignLocation) => void;
  center?: { lat: number; lng: number };
  className?: string;
};

export function SignTrackerMap({
  locations,
  selectedCity,
  onSelectLocation,
  center,
  className = 'h-[400px] w-full rounded-xl',
}: SignTrackerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('mapbox-gl').Map | null>(null);
  const markersRef = useRef<import('mapbox-gl').Marker[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);

  const filtered = selectedCity
    ? locations.filter((l) => l.location.city.toLowerCase() === selectedCity.toLowerCase())
    : locations;

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setMapError('Map unavailable — set NEXT_PUBLIC_MAPBOX_TOKEN');
      return;
    }

    let cancelled = false;

    async function initMap() {
      const mapboxgl = (await import('mapbox-gl')).default;
      if (cancelled || !containerRef.current) return;

      mapboxgl.accessToken = token!;
      const defaultCenter = center ?? (filtered[0]
        ? { lat: filtered[0].location.latitude, lng: filtered[0].location.longitude }
        : { lat: 35.0, lng: -90.0 });

      if (!mapRef.current) {
        mapRef.current = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [defaultCenter.lng, defaultCenter.lat],
          zoom: filtered.length ? 11 : 8,
        });
        mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      }
    }

    initMap().catch(() => setMapError('Failed to load map'));
    return () => { cancelled = true; };
  }, [center, filtered]);

  useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    async function addMarkers() {
      const mapboxgl = (await import('mapbox-gl')).default;
      for (const loc of filtered) {
        if (!loc.location.latitude || !loc.location.longitude) continue;
        const el = document.createElement('div');
        el.className = 'cursor-pointer';
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = STATUS_COLORS[loc.status] ?? '#6b7280';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([loc.location.longitude, loc.location.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(`
              <div style="min-width:180px;padding:4px">
                <strong>${loc.location.address || loc.location.city}</strong>
                <p style="margin:4px 0;font-size:12px">${loc.location.city}, ${loc.location.state}</p>
                <p style="margin:0;font-size:12px">Qty: ${loc.signData.quantityPlaced} · ${loc.status.replace(/_/g, ' ')}</p>
              </div>
            `),
          )
          .addTo(mapRef.current!);

        el.addEventListener('click', () => onSelectLocation?.(loc));
        markersRef.current.push(marker);
      }

      if (filtered.length > 0 && mapRef.current) {
        const bounds = new mapboxgl.LngLatBounds();
        filtered.forEach((l) => {
          if (l.location.latitude && l.location.longitude) {
            bounds.extend([l.location.longitude, l.location.latitude]);
          }
        });
        if (!bounds.isEmpty()) {
          mapRef.current.fitBounds(bounds, { padding: 50, maxZoom: 14 });
        }
      }
    }

    addMarkers();
  }, [filtered, onSelectLocation]);

  if (mapError) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted text-sm text-muted-foreground`}>
        {mapError}
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
}

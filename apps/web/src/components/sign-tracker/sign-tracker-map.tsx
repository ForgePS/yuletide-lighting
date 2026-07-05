'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import type { SignLocationListItem } from '@clcrm/types';
import { STATUS_COLORS } from '@/lib/sign-tracker-utils';

type SignTrackerMapProps = {
  locations: SignLocationListItem[];
  selectedCity?: string | null;
  onSelectLocation?: (location: SignLocationListItem) => void;
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
  const mapboxRef = useRef<typeof import('mapbox-gl').default | null>(null);
  const markersRef = useRef<import('mapbox-gl').Marker[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const filtered = useMemo(() => {
    if (!selectedCity) return locations;
    const cityLower = selectedCity.toLowerCase();
    return locations.filter((l) => l.location.city.toLowerCase() === cityLower);
  }, [locations, selectedCity]);

  const mapPoints = useMemo(
    () =>
      filtered.filter(
        (l) => l.location.latitude && l.location.longitude,
      ),
    [filtered],
  );

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setMapError('Map unavailable — set NEXT_PUBLIC_MAPBOX_TOKEN');
      return;
    }

    let cancelled = false;

    async function initMap() {
      if (!mapboxRef.current) {
        mapboxRef.current = (await import('mapbox-gl')).default;
      }
      const mapboxgl = mapboxRef.current;
      if (cancelled || !containerRef.current || !mapboxgl) return;

      mapboxgl.accessToken = token!;
      const defaultCenter = center ?? (mapPoints[0]
        ? { lat: mapPoints[0].location.latitude, lng: mapPoints[0].location.longitude }
        : { lat: 35.0, lng: -90.0 });

      if (!mapRef.current) {
        mapRef.current = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [defaultCenter.lng, defaultCenter.lat],
          zoom: mapPoints.length ? 11 : 8,
        });
        mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        mapRef.current.on('load', () => setMapReady(true));
      }
    }

    initMap().catch(() => setMapError('Failed to load map'));
    return () => {
      cancelled = true;
    };
  }, [center, mapPoints.length]);

  useEffect(() => {
    if (!mapRef.current || !mapReady || !mapboxRef.current) return;

    const mapboxgl = mapboxRef.current;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const loc of mapPoints) {
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
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div style="min-width:180px;padding:4px">
              <strong>${loc.location.address || loc.location.city}</strong>
              <p style="margin:4px 0;font-size:12px">${loc.location.city}, ${loc.location.state}</p>
              <p style="margin:0;font-size:12px">Qty: ${loc.signData.quantityPlaced} · ${loc.status.replace(/_/g, ' ')}</p>
            </div>`,
          ),
        )
        .addTo(mapRef.current!);

      el.addEventListener('click', () => onSelectLocation?.(loc));
      markersRef.current.push(marker);
    }

    if (mapPoints.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      mapPoints.forEach((l) => bounds.extend([l.location.longitude, l.location.latitude]));
      if (!bounds.isEmpty()) {
        mapRef.current.fitBounds(bounds, { padding: 50, maxZoom: 14 });
      }
    }
  }, [mapPoints, mapReady, onSelectLocation]);

  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.remove());
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  if (mapError) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted text-sm text-muted-foreground`}>
        {mapError}
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
}

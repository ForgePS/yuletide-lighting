'use client';

import { useEffect, useRef, useState } from 'react';
import { resolveMapboxPublicToken } from '@/lib/mapbox-env';

type Props = {
  lat: number;
  lng: number;
  zoom?: number;
  markerLabel?: string;
  height?: number;
};

export function CmsMapEmbed({ lat, lng, zoom = 12, markerLabel, height = 320 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let map: { remove: () => void } | null = null;
    let cancelled = false;

    async function boot() {
      const token = await resolveMapboxPublicToken();
      if (cancelled) return;
      if (!token) {
        setError('Map unavailable — Mapbox token not configured.');
        return;
      }
      if (!containerRef.current) return;

      try {
        const mapboxgl = (await import('mapbox-gl')).default;
        // @ts-expect-error css side-effect
        await import('mapbox-gl/dist/mapbox-gl.css');
        mapboxgl.accessToken = token;
        const instance = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [lng, lat],
          zoom,
        });
        new mapboxgl.Marker().setLngLat([lng, lat]).addTo(instance);
        if (markerLabel) {
          new mapboxgl.Popup({ offset: 24 })
            .setLngLat([lng, lat])
            .setText(markerLabel)
            .addTo(instance);
        }
        map = instance;
      } catch {
        if (!cancelled) setError('Could not load map.');
      }
    }

    void boot();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lng, zoom, markerLabel]);

  if (error) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-border bg-muted/40 text-sm text-muted-foreground"
        style={{ height }}
      >
        {error}
      </div>
    );
  }

  return <div ref={containerRef} className="w-full overflow-hidden rounded-2xl" style={{ height }} />;
}

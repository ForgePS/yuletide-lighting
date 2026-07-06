'use client';

import { useEffect, useRef, useState } from 'react';
import { getMapboxPublicToken } from '@/lib/mapbox-env';
import 'mapbox-gl/dist/mapbox-gl.css';

export type SignLocationPinMapProps = {
  latitude: number;
  longitude: number;
  onChange?: (coords: { latitude: number; longitude: number }) => void;
  className?: string;
  zoom?: number;
  interactive?: boolean;
};

function hasValidCoords(latitude: number, longitude: number) {
  return latitude !== 0 && longitude !== 0;
}

export function SignLocationPinMap({
  latitude,
  longitude,
  onChange,
  className = 'h-[300px] w-full rounded-xl border',
  zoom = 17,
  interactive = true,
}: SignLocationPinMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('mapbox-gl').Map | null>(null);
  const markerRef = useRef<import('mapbox-gl').Marker | null>(null);
  const mapboxRef = useRef<typeof import('mapbox-gl').default | null>(null);
  const onChangeRef = useRef(onChange);
  const draggingRef = useRef(false);
  const [mapError, setMapError] = useState<string | null>(null);

  onChangeRef.current = onChange;

  const coordsReady = hasValidCoords(latitude, longitude);

  useEffect(() => {
    const token = getMapboxPublicToken();
    if (!token) {
      setMapError('Map unavailable — add NEXT_PUBLIC_MAPBOX_TOKEN and redeploy.');
      return;
    }
    if (!coordsReady || !containerRef.current) return;

    let cancelled = false;

    async function initMap() {
      if (!mapboxRef.current) {
        mapboxRef.current = (await import('mapbox-gl')).default;
      }
      const mapboxgl = mapboxRef.current;
      if (cancelled || !containerRef.current || !mapboxgl) return;

      mapboxgl.accessToken = token;

      if (!mapRef.current) {
        mapRef.current = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/satellite-streets-v12',
          center: [longitude, latitude],
          zoom,
        });
        mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        const el = document.createElement('div');
        el.style.width = '30px';
        el.style.height = '30px';
        el.style.borderRadius = '50% 50% 50% 0';
        el.style.transform = 'rotate(-45deg)';
        el.style.backgroundColor = '#dc2626';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.45)';
        el.style.cursor = interactive ? 'grab' : 'default';

        markerRef.current = new mapboxgl.Marker({ element: el, draggable: interactive })
          .setLngLat([longitude, latitude])
          .addTo(mapRef.current);

        markerRef.current.on('dragstart', () => {
          draggingRef.current = true;
        });
        markerRef.current.on('dragend', () => {
          draggingRef.current = false;
          const lngLat = markerRef.current!.getLngLat();
          onChangeRef.current?.({ latitude: lngLat.lat, longitude: lngLat.lng });
        });

        if (interactive) {
          mapRef.current.on('click', (event) => {
            markerRef.current?.setLngLat(event.lngLat);
            onChangeRef.current?.({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
          });
        }
      }
    }

    initMap().catch(() => setMapError('Failed to load map'));

    return () => {
      cancelled = true;
    };
  }, [coordsReady, interactive, latitude, longitude, zoom]);

  useEffect(() => {
    if (!markerRef.current || !mapRef.current || draggingRef.current || !coordsReady) return;
    const current = markerRef.current.getLngLat();
    if (
      Math.abs(current.lat - latitude) > 0.000001 ||
      Math.abs(current.lng - longitude) > 0.000001
    ) {
      markerRef.current.setLngLat([longitude, latitude]);
      mapRef.current.setCenter([longitude, latitude]);
    }
  }, [latitude, longitude, coordsReady]);

  useEffect(() => {
    return () => {
      markerRef.current?.remove();
      mapRef.current?.remove();
      markerRef.current = null;
      mapRef.current = null;
    };
  }, []);

  if (mapError) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-muted p-4 text-center text-sm text-muted-foreground`}
      >
        {mapError}
      </div>
    );
  }

  if (!coordsReady) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-muted text-sm text-muted-foreground`}
      >
        Capture GPS to preview the map
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={containerRef} className={className} />
      {interactive ? (
        <p className="text-xs text-muted-foreground">
          Drag the pin or tap the map to place the sign exactly where it sits.
        </p>
      ) : null}
      <p className="font-mono text-xs text-muted-foreground">
        {latitude.toFixed(6)}, {longitude.toFixed(6)}
      </p>
    </div>
  );
}

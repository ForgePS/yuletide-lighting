'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { resolveMapboxPublicToken } from '@/lib/mapbox-env';
import 'mapbox-gl/dist/mapbox-gl.css';

export type RouteMapStop = {
  id: string;
  order: number;
  customerName?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type RouteMapProps = {
  stops: RouteMapStop[];
  className?: string;
};

function hasCoords(stop: RouteMapStop) {
  return (
    typeof stop.latitude === 'number' &&
    typeof stop.longitude === 'number' &&
    Number.isFinite(stop.latitude) &&
    Number.isFinite(stop.longitude)
  );
}

export function RouteMap({ stops, className = 'h-[320px] w-full rounded-xl' }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('mapbox-gl').Map | null>(null);
  const mapboxRef = useRef<typeof import('mapbox-gl').default | null>(null);
  const markersRef = useRef<import('mapbox-gl').Marker[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const mapPoints = useMemo(() => stops.filter(hasCoords), [stops]);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      const token = await resolveMapboxPublicToken();
      if (cancelled) return;
      if (!token) {
        setMapError(
          'Map unavailable — add a Mapbox token (NEXT_PUBLIC_MAPBOX_TOKEN or MAPBOX_TOKEN) to .env and redeploy.',
        );
        return;
      }
      if (!containerRef.current) return;

      if (!mapboxRef.current) {
        mapboxRef.current = (await import('mapbox-gl')).default;
      }
      const mapboxgl = mapboxRef.current;
      if (cancelled || !containerRef.current || !mapboxgl) return;

      mapboxgl.accessToken = token;
      const first = mapPoints[0];
      const defaultCenter = first
        ? { lat: first.latitude!, lng: first.longitude! }
        : { lat: 35.0, lng: -90.0 };

      if (!mapRef.current) {
        mapRef.current = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [defaultCenter.lng, defaultCenter.lat],
          zoom: mapPoints.length ? 11 : 8,
        });
        mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        mapRef.current.on('load', () => {
          if (!cancelled) setMapReady(true);
        });
      }
    }

    initMap().catch(() => {
      if (!cancelled) setMapError('Failed to load map');
    });

    return () => {
      cancelled = true;
    };
  }, [mapPoints.length]);

  useEffect(() => {
    if (!mapRef.current || !mapReady || !mapboxRef.current) return;

    const mapboxgl = mapboxRef.current;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const ordered = [...mapPoints].sort((a, b) => a.order - b.order);

    for (const stop of ordered) {
      const el = document.createElement('div');
      el.style.width = '28px';
      el.style.height = '28px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = '#0f766e';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.35)';
      el.style.color = 'white';
      el.style.fontSize = '12px';
      el.style.fontWeight = '700';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.textContent = String(stop.order);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([stop.longitude!, stop.latitude!])
        .setPopup(
          new mapboxgl.Popup({ offset: 20 }).setHTML(
            `<div style="min-width:160px;padding:4px">
              <strong>${stop.order}. ${stop.customerName ?? 'Stop'}</strong>
              <p style="margin:4px 0 0;font-size:12px">${stop.address ?? ''}</p>
            </div>`,
          ),
        )
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    }

    if (ordered.length === 1) {
      mapRef.current.setCenter([ordered[0]!.longitude!, ordered[0]!.latitude!]);
      mapRef.current.setZoom(12);
    } else if (ordered.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      ordered.forEach((s) => bounds.extend([s.longitude!, s.latitude!]));
      if (!bounds.isEmpty()) {
        mapRef.current.fitBounds(bounds, { padding: 48, maxZoom: 14 });
      }

      const coords = ordered.map((s) => [s.longitude!, s.latitude!] as [number, number]);
      const sourceId = 'route-line';
      const layerId = 'route-line-layer';
      if (mapRef.current.getLayer(layerId)) mapRef.current.removeLayer(layerId);
      if (mapRef.current.getSource(sourceId)) mapRef.current.removeSource(sourceId);
      mapRef.current.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: coords },
        },
      });
      mapRef.current.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#0f766e', 'line-width': 3, 'line-opacity': 0.75 },
      });
    }
  }, [mapPoints, mapReady]);

  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
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

  if (!mapPoints.length) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted text-sm text-muted-foreground`}>
        No stop coordinates yet — re-optimize the route after properties have lat/lng.
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
}

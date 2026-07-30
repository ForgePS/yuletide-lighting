'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/lib/firebase-auth';
import { useToast } from '@/lib/toast';
import { currentSeasonYear, PLACEMENT_TYPE_LABELS } from '@/lib/sign-tracker-utils';
import type { SignPlacementType } from '@clcrm/types';
import { MapPin, Camera } from 'lucide-react';

const SignLocationPinMap = dynamic(
  () => import('./sign-location-pin-map').then((m) => m.SignLocationPinMap),
  { ssr: false, loading: () => <div className="h-[300px] animate-pulse rounded-xl bg-muted" /> },
);

export function AddSignLocationForm() {
  const router = useRouter();
  const { idToken, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const ready = !authLoading && !!idToken;
  const skipGeocodeFill = useRef(false);
  const [step, setStep] = useState(1);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    seasonYear: currentSeasonYear(),
    latitude: 0,
    longitude: 0,
    address: '',
    city: '',
    state: '',
    zip: '',
    neighborhood: '',
    quantityPlaced: 1,
    placementType: 'customer_yard' as SignPlacementType,
    notes: '',
    photoUrl: '',
  });
  const [geocodeCoords, setGeocodeCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (step !== 2 || form.latitude === 0 || form.longitude === 0) return;
    const timer = window.setTimeout(() => {
      setGeocodeCoords({ latitude: form.latitude, longitude: form.longitude });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [form.latitude, form.longitude, step]);

  const reverseGeocode = trpc.signTracker360.reverseGeocode.useQuery(
    geocodeCoords ?? { latitude: 0, longitude: 0 },
    { enabled: ready && step === 2 && !!geocodeCoords },
  );

  const create = trpc.signTracker360.create.useMutation({
    onSuccess: () => {
      toast('Sign location saved', 'success');
      router.push('/app/marketing/sign-tracker');
    },
    onError: (error) => toast(error.message, 'error'),
  });

  useEffect(() => {
    if (!reverseGeocode.data || step !== 2 || skipGeocodeFill.current) return;
    setForm((current) => ({
      ...current,
      address: reverseGeocode.data.address || current.address,
      city: reverseGeocode.data.city || current.city,
      state: reverseGeocode.data.state || current.state,
      zip: reverseGeocode.data.zip || current.zip,
      neighborhood: reverseGeocode.data.neighborhood || current.neighborhood,
    }));
  }, [reverseGeocode.data, step]);

  function captureGps() {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        skipGeocodeFill.current = false;
        setForm((current) => ({
          ...current,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setGpsLoading(false);
        setStep(2);
      },
      () => {
        toast('Could not get GPS location', 'error');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function handlePinChange(coords: { latitude: number; longitude: number }) {
    skipGeocodeFill.current = false;
    setForm((current) => ({ ...current, ...coords }));
  }

  function updateAddressField<K extends 'address' | 'city' | 'state' | 'zip' | 'neighborhood'>(
    key: K,
    value: string,
  ) {
    skipGeocodeFill.current = true;
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handlePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('folder', 'sign-photos');
      const response = await fetch('/api/upload', { method: 'POST', body });
      const data = await response.json();
      if (data.url) setForm((current) => ({ ...current, photoUrl: data.url }));
    } catch {
      toast('Photo upload failed', 'error');
    } finally {
      setUploading(false);
    }
  }

  function handleSave() {
    create.mutate({
      seasonYear: form.seasonYear,
      location: {
        latitude: form.latitude,
        longitude: form.longitude,
        address: form.address,
        city: form.city,
        state: form.state,
        zip: form.zip,
        neighborhood: form.neighborhood || null,
      },
      quantityPlaced: form.quantityPlaced,
      placementType: form.placementType,
      notes: form.notes || null,
      photoUrl: form.photoUrl || null,
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex gap-2">
        {[1, 2, 3].map((value) => (
          <div
            key={value}
            className={`h-2 flex-1 rounded-full ${step >= value ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>

      {step === 1 ? (
        <div className="card space-y-4 p-6">
          <h2 className="text-lg font-semibold">Step 1: Capture Location</h2>
          <p className="text-sm text-muted-foreground">
            GPS captures your current position. On the next step you can drag the pin on the map to
            match the exact sign placement.
          </p>
          <button
            type="button"
            className="btn-primary w-full py-4 text-lg"
            disabled={gpsLoading}
            onClick={captureGps}
          >
            <MapPin className="h-5 w-5" />
            {gpsLoading ? 'Getting GPS...' : 'Capture GPS Location'}
          </button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="card space-y-4 p-6">
          <h2 className="text-lg font-semibold">Step 2: Confirm Location on Map</h2>
          <p className="text-sm text-muted-foreground">
            Move the pin to the exact spot where the sign is installed, then confirm the address
            below.
          </p>

          <SignLocationPinMap
            latitude={form.latitude}
            longitude={form.longitude}
            onChange={handlePinChange}
          />

          {reverseGeocode.isFetching ? (
            <p className="text-sm text-muted-foreground">Looking up address for pin location...</p>
          ) : null}

          <label className="block text-sm">
            <span className="text-muted-foreground">Address</span>
            <input
              className="input mt-1 w-full"
              value={form.address}
              onChange={(event) => updateAddressField('address', event.target.value)}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-muted-foreground">City</span>
              <input
                className="input mt-1 w-full"
                value={form.city}
                onChange={(event) => updateAddressField('city', event.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">State</span>
              <input
                className="input mt-1 w-full"
                value={form.state}
                onChange={(event) => updateAddressField('state', event.target.value)}
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-muted-foreground">ZIP</span>
              <input
                className="input mt-1 w-full"
                value={form.zip}
                onChange={(event) => updateAddressField('zip', event.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Neighborhood</span>
              <input
                className="input mt-1 w-full"
                value={form.neighborhood}
                onChange={(event) => updateAddressField('neighborhood', event.target.value)}
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1 py-3" onClick={() => setStep(1)}>
              Back
            </button>
            <button type="button" className="btn-primary flex-1 py-3" onClick={() => setStep(3)}>
              Continue
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="card space-y-4 p-6">
          <h2 className="text-lg font-semibold">Step 3: Sign Details</h2>
          <SignLocationPinMap
            latitude={form.latitude}
            longitude={form.longitude}
            interactive={false}
            className="h-[220px] w-full rounded-xl border"
          />
          <label className="block text-sm">
            <span className="text-muted-foreground">Number of signs placed</span>
            <input
              type="number"
              min={1}
              className="input mt-1 w-full text-lg"
              value={form.quantityPlaced}
              onChange={(event) =>
                setForm((current) => ({ ...current, quantityPlaced: Number(event.target.value) }))
              }
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Placement type</span>
            <select
              className="input mt-1 w-full"
              value={form.placementType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  placementType: event.target.value as SignPlacementType,
                }))
              }
            >
              {(Object.keys(PLACEMENT_TYPE_LABELS) as SignPlacementType[]).map((type) => (
                <option key={type} value={type}>
                  {PLACEMENT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Notes</span>
            <textarea
              className="input mt-1 w-full"
              rows={2}
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </label>
          <label className="btn-secondary flex cursor-pointer items-center justify-center gap-2 py-3">
            <Camera className="h-5 w-5" />
            {uploading ? 'Uploading...' : form.photoUrl ? 'Photo added ✓' : 'Upload photo (optional)'}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
          </label>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1 py-3" onClick={() => setStep(2)}>
              Back
            </button>
            <button
              type="button"
              className="btn-primary flex-1 py-4 text-lg"
              disabled={create.isPending}
              onClick={handleSave}
            >
              {create.isPending ? 'Saving...' : 'Save Sign Location'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

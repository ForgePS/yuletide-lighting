'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { SignLocation, SignLocationListItem, SignLocationStatus, SignPlacementType } from '@clcrm/types';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { PLACEMENT_TYPE_LABELS, STATUS_LABELS } from '@/lib/sign-tracker-utils';
import { Camera } from 'lucide-react';

const SignLocationPinMap = dynamic(
  () => import('./sign-location-pin-map').then((m) => m.SignLocationPinMap),
  { ssr: false, loading: () => <div className="h-[300px] animate-pulse rounded-xl bg-muted" /> },
);

type SignLocationEditFormProps = {
  location: SignLocation | SignLocationListItem;
  canManage: boolean;
  onSaved: () => void;
  onCancel: () => void;
};

export function SignLocationEditForm({ location, canManage, onSaved, onCancel }: SignLocationEditFormProps) {
  const { toast } = useToast();
  const skipGeocodeFill = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    latitude: location.location.latitude,
    longitude: location.location.longitude,
    address: location.location.address,
    city: location.location.city,
    state: location.location.state,
    zip: location.location.zip,
    neighborhood: location.location.neighborhood ?? '',
    quantityPlaced: location.signData.quantityPlaced,
    placementType: location.placementType,
    status: location.status,
    notes: location.notes ?? '',
    photoUrl: location.photos[0]?.imageUrl ?? '',
  });

  const [geocodeCoords, setGeocodeCoords] = useState({
    latitude: location.location.latitude,
    longitude: location.location.longitude,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setGeocodeCoords({ latitude: form.latitude, longitude: form.longitude });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [form.latitude, form.longitude]);

  const reverseGeocode = trpc.signTracker360.reverseGeocode.useQuery(geocodeCoords, {
    enabled: geocodeCoords.latitude !== 0 && geocodeCoords.longitude !== 0,
  });

  useEffect(() => {
    if (!reverseGeocode.data || skipGeocodeFill.current) return;
    setForm((current) => ({
      ...current,
      address: reverseGeocode.data.address || current.address,
      city: reverseGeocode.data.city || current.city,
      state: reverseGeocode.data.state || current.state,
      zip: reverseGeocode.data.zip || current.zip,
      neighborhood: reverseGeocode.data.neighborhood || current.neighborhood,
    }));
  }, [reverseGeocode.data]);

  const update = trpc.signTracker360.update.useMutation({
    onSuccess: () => {
      toast('Sign location updated', 'success');
      onSaved();
    },
    onError: (error) => toast(error.message, 'error'),
  });

  const remove = trpc.signTracker360.delete.useMutation({
    onSuccess: () => {
      toast('Sign location deleted', 'success');
      onSaved();
    },
    onError: (error) => toast(error.message, 'error'),
  });

  function handlePinChange(coords: { latitude: number; longitude: number }) {
    skipGeocodeFill.current = false;
    setForm((current) => ({ ...current, ...coords }));
  }

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    if (key === 'address' || key === 'city' || key === 'state' || key === 'zip' || key === 'neighborhood') {
      skipGeocodeFill.current = true;
    }
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
    update.mutate({
      locationId: location.id,
      location: {
        latitude: form.latitude,
        longitude: form.longitude,
        address: form.address,
        city: form.city,
        state: form.state,
        zip: form.zip,
        neighborhood: form.neighborhood || null,
      },
      placementType: form.placementType,
      notes: form.notes || null,
      photoUrl: form.photoUrl || null,
      ...(canManage
        ? {
            quantityPlaced: form.quantityPlaced,
            status: form.status,
          }
        : {}),
    });
  }

  return (
    <div className="space-y-4">
      <SignLocationPinMap
        latitude={form.latitude}
        longitude={form.longitude}
        onChange={handlePinChange}
      />
      {reverseGeocode.isFetching ? (
        <p className="text-xs text-muted-foreground">Updating address from pin location...</p>
      ) : null}

      <label className="block text-sm">
        <span className="text-muted-foreground">Address</span>
        <input
          className="input mt-1 w-full"
          value={form.address}
          onChange={(event) => updateField('address', event.target.value)}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-muted-foreground">City</span>
          <input
            className="input mt-1 w-full"
            value={form.city}
            onChange={(event) => updateField('city', event.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">State</span>
          <input
            className="input mt-1 w-full"
            value={form.state}
            onChange={(event) => updateField('state', event.target.value)}
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-muted-foreground">ZIP</span>
          <input
            className="input mt-1 w-full"
            value={form.zip}
            onChange={(event) => updateField('zip', event.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Neighborhood</span>
          <input
            className="input mt-1 w-full"
            value={form.neighborhood}
            onChange={(event) => updateField('neighborhood', event.target.value)}
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-muted-foreground">Placement type</span>
        <select
          className="input mt-1 w-full"
          value={form.placementType}
          onChange={(event) => updateField('placementType', event.target.value as SignPlacementType)}
        >
          {(Object.keys(PLACEMENT_TYPE_LABELS) as SignPlacementType[]).map((type) => (
            <option key={type} value={type}>
              {PLACEMENT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </label>

      {canManage ? (
        <>
          <label className="block text-sm">
            <span className="text-muted-foreground">Quantity placed</span>
            <input
              type="number"
              min={1}
              className="input mt-1 w-full"
              value={form.quantityPlaced}
              onChange={(event) => updateField('quantityPlaced', Number(event.target.value))}
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Status</span>
            <select
              className="input mt-1 w-full"
              value={form.status}
              onChange={(event) => updateField('status', event.target.value as SignLocationStatus)}
            >
              {(Object.keys(STATUS_LABELS) as SignLocationStatus[]).map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}

      <label className="block text-sm">
        <span className="text-muted-foreground">Notes</span>
        <textarea
          className="input mt-1 w-full"
          rows={3}
          value={form.notes}
          onChange={(event) => updateField('notes', event.target.value)}
        />
      </label>

      <label className="btn-secondary flex cursor-pointer items-center justify-center gap-2 py-3">
        <Camera className="h-5 w-5" />
        {uploading ? 'Uploading...' : form.photoUrl ? 'Replace photo' : 'Add photo'}
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
      </label>
      {form.photoUrl ? (
        <img src={form.photoUrl} alt="Sign" className="w-full rounded-lg object-cover" />
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary flex-1" disabled={update.isPending} onClick={handleSave}>
          {update.isPending ? 'Saving...' : 'Save changes'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>

      {canManage ? (
        <button
          type="button"
          className="w-full rounded-xl border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
          disabled={remove.isPending}
          onClick={() => {
            if (window.confirm('Delete this sign location? This cannot be undone.')) {
              remove.mutate({ locationId: location.id });
            }
          }}
        >
          {remove.isPending ? 'Deleting...' : 'Delete sign location'}
        </button>
      ) : null}
    </div>
  );
}

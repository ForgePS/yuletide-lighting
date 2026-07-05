'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/lib/firebase-auth';
import { useToast } from '@/lib/toast';
import { currentSeasonYear, PLACEMENT_TYPE_LABELS } from '@/lib/sign-tracker-utils';
import type { SignPlacementType } from '@clcrm/types';
import { MapPin, Camera } from 'lucide-react';

export function AddSignLocationForm() {
  const router = useRouter();
  const { idToken, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const ready = !authLoading && !!idToken;
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

  const reverseGeocode = trpc.signTracker360.reverseGeocode.useQuery(
    { latitude: form.latitude, longitude: form.longitude },
    { enabled: ready && form.latitude !== 0 && form.longitude !== 0 },
  );

  const create = trpc.signTracker360.create.useMutation({
    onSuccess: () => {
      toast('Sign location saved', 'success');
      router.push('/app/marketing/sign-tracker');
    },
    onError: (e) => toast(e.message, 'error'),
  });

  useEffect(() => {
    if (reverseGeocode.data && step === 1) {
      setForm((f) => ({
        ...f,
        address: reverseGeocode.data.address || f.address,
        city: reverseGeocode.data.city || f.city,
        state: reverseGeocode.data.state || f.state,
        zip: reverseGeocode.data.zip || f.zip,
        neighborhood: reverseGeocode.data.neighborhood || f.neighborhood,
      }));
    }
  }, [reverseGeocode.data, step]);

  function captureGps() {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
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

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'sign-photos');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) setForm((f) => ({ ...f, photoUrl: data.url }));
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
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`h-2 flex-1 rounded-full ${step >= s ? 'bg-primary' : 'bg-muted'}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="card space-y-4 p-6">
          <h2 className="text-lg font-semibold">Step 1: Capture Location</h2>
          <p className="text-sm text-muted-foreground">GPS will be captured automatically. You can correct the address on the next step.</p>
          <button type="button" className="btn-primary w-full py-4 text-lg" disabled={gpsLoading} onClick={captureGps}>
            <MapPin className="h-5 w-5" />
            {gpsLoading ? 'Getting GPS...' : 'Capture GPS Location'}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="card space-y-4 p-6">
          <h2 className="text-lg font-semibold">Step 2: Confirm Address</h2>
          {reverseGeocode.isLoading && <p className="text-sm text-muted-foreground">Reverse geocoding...</p>}
          <label className="block text-sm">
            <span className="text-muted-foreground">Address</span>
            <input className="input mt-1 w-full" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-muted-foreground">City</span>
              <input className="input mt-1 w-full" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">State</span>
              <input className="input mt-1 w-full" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-muted-foreground">ZIP</span>
            <input className="input mt-1 w-full" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
          </label>
          <button type="button" className="btn-primary w-full py-3" onClick={() => setStep(3)}>Continue</button>
        </div>
      )}

      {step === 3 && (
        <div className="card space-y-4 p-6">
          <h2 className="text-lg font-semibold">Step 3: Sign Details</h2>
          <label className="block text-sm">
            <span className="text-muted-foreground">Number of signs placed</span>
            <input type="number" min={1} className="input mt-1 w-full text-lg" value={form.quantityPlaced} onChange={(e) => setForm({ ...form, quantityPlaced: Number(e.target.value) })} />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Placement type</span>
            <select className="input mt-1 w-full" value={form.placementType} onChange={(e) => setForm({ ...form, placementType: e.target.value as SignPlacementType })}>
              {(Object.keys(PLACEMENT_TYPE_LABELS) as SignPlacementType[]).map((t) => (
                <option key={t} value={t}>{PLACEMENT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Notes</span>
            <textarea className="input mt-1 w-full" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
          <label className="btn-secondary flex cursor-pointer items-center justify-center gap-2 py-3">
            <Camera className="h-5 w-5" />
            {uploading ? 'Uploading...' : form.photoUrl ? 'Photo added ✓' : 'Upload photo (optional)'}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
          </label>
          <button type="button" className="btn-primary w-full py-4 text-lg" disabled={create.isPending} onClick={handleSave}>
            {create.isPending ? 'Saving...' : 'Save Sign Location'}
          </button>
        </div>
      )}
    </div>
  );
}

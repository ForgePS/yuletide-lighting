'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { SignLocation, SignLocationListItem } from '@clcrm/types';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { PLACEMENT_TYPE_LABELS, STATUS_BADGE_CLASSES, STATUS_LABELS } from '@/lib/sign-tracker-utils';
import { SignLocationEditForm } from './sign-location-edit-form';
import { Navigation, Pencil, X } from 'lucide-react';

const SignLocationPinMap = dynamic(
  () => import('./sign-location-pin-map').then((m) => m.SignLocationPinMap),
  { ssr: false, loading: () => <div className="h-[220px] animate-pulse rounded-xl bg-muted" /> },
);

type SignLocationDetailProps = {
  location: SignLocation | SignLocationListItem;
  onClose: () => void;
  onUpdated: () => void;
  initialMode?: DetailMode;
};

type DetailMode = 'view' | 'edit' | 'recover';

function canManageSigns(role?: string | null) {
  return !!role && ['owner', 'admin', 'office'].includes(role);
}

export function SignLocationDetail({
  location,
  onClose,
  onUpdated,
  initialMode = 'view',
}: SignLocationDetailProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<DetailMode>(initialMode);
  const [recovered, setRecovered] = useState(0);
  const [missing, setMissing] = useState(0);
  const [recoveryType, setRecoveryType] = useState<
    'recovered_all' | 'partial_recovery' | 'missing' | 'city_removed' | 'damaged' | 'other'
  >('recovered_all');
  const [notes, setNotes] = useState('');

  const { data: me } = trpc.settings360.me.useQuery(undefined, { staleTime: 60_000 });
  const canManage = canManageSigns(me?.legacyRole ?? me?.role);

  const recover = trpc.signTracker360.recover.useMutation({
    onSuccess: () => {
      toast('Sign location updated', 'success');
      onUpdated();
    },
    onError: (error) => toast(error.message, 'error'),
  });

  const navigateUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.location.latitude},${location.location.longitude}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="card max-h-[92vh] w-full max-w-2xl overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">{location.location.address || location.location.city}</h2>
            <p className="text-sm text-muted-foreground">
              {location.location.city}, {location.location.state}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {mode === 'edit' ? (
          <div className="mt-4">
            <SignLocationEditForm
              location={location}
              canManage={canManage}
              onSaved={onUpdated}
              onCancel={() => setMode('view')}
            />
          </div>
        ) : (
          <>
            <div className="mt-4">
              <SignLocationPinMap
                latitude={location.location.latitude}
                longitude={location.location.longitude}
                interactive={false}
                className="h-[220px] w-full rounded-xl border"
              />
            </div>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Quantity placed</dt>
                <dd className="font-medium">{location.signData.quantityPlaced}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Recovered</dt>
                <dd>{location.signData.quantityRecovered}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Missing</dt>
                <dd>{location.signData.quantityMissing}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE_CLASSES[location.status]}`}>
                    {STATUS_LABELS[location.status]}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Type</dt>
                <dd>{PLACEMENT_TYPE_LABELS[location.placementType]}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Placed</dt>
                <dd>{new Date(location.signData.placementDate).toLocaleDateString()}</dd>
              </div>
            </dl>

            {location.photos[0] ? (
              <img src={location.photos[0].imageUrl} alt="Sign" className="mt-4 w-full rounded-lg object-cover" />
            ) : null}
            {location.notes ? <p className="mt-3 text-sm text-muted-foreground">{location.notes}</p> : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <a href={navigateUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary flex-1">
                <Navigation className="h-4 w-4" /> Navigate
              </a>
              <button type="button" className="btn-secondary flex-1" onClick={() => setMode('edit')}>
                <Pencil className="h-4 w-4" /> Edit
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={() => setMode(mode === 'recover' ? 'view' : 'recover')}
              >
                Update Status
              </button>
            </div>

            {mode === 'recover' ? (
              <div className="mt-4 space-y-3 rounded-xl border p-4">
                <label className="block text-sm">
                  <span className="text-muted-foreground">Recovery type</span>
                  <select
                    className="input mt-1 w-full"
                    value={recoveryType}
                    onChange={(event) => setRecoveryType(event.target.value as typeof recoveryType)}
                  >
                    <option value="recovered_all">Recovered All</option>
                    <option value="partial_recovery">Partial Recovery</option>
                    <option value="missing">Missing</option>
                    <option value="city_removed">City Removed</option>
                    <option value="damaged">Damaged</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                {recoveryType === 'partial_recovery' ? (
                  <>
                    <label className="block text-sm">
                      <span className="text-muted-foreground">Recovered qty</span>
                      <input
                        type="number"
                        min={0}
                        className="input mt-1 w-full"
                        value={recovered}
                        onChange={(event) => setRecovered(Number(event.target.value))}
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-muted-foreground">Missing qty</span>
                      <input
                        type="number"
                        min={0}
                        className="input mt-1 w-full"
                        value={missing}
                        onChange={(event) => setMissing(Number(event.target.value))}
                      />
                    </label>
                  </>
                ) : null}
                <label className="block text-sm">
                  <span className="text-muted-foreground">Notes</span>
                  <textarea
                    className="input mt-1 w-full"
                    rows={2}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="btn-primary w-full"
                  disabled={recover.isPending}
                  onClick={() =>
                    recover.mutate({
                      locationId: location.id,
                      quantityRecovered: recovered,
                      quantityMissing: missing,
                      recoveryType,
                      notes: notes || undefined,
                    })
                  }
                >
                  Save Recovery
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import type { SignLocation, SignLocationListItem } from '@clcrm/types';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { PLACEMENT_TYPE_LABELS, STATUS_BADGE_CLASSES, STATUS_LABELS } from '@/lib/sign-tracker-utils';
import { Navigation, X } from 'lucide-react';

type SignLocationDetailProps = {
  location: SignLocation | SignLocationListItem;
  onClose: () => void;
  onUpdated: () => void;
};

export function SignLocationDetail({ location, onClose, onUpdated }: SignLocationDetailProps) {
  const { toast } = useToast();
  const [recovered, setRecovered] = useState(0);
  const [missing, setMissing] = useState(0);
  const [recoveryType, setRecoveryType] = useState<'recovered_all' | 'partial_recovery' | 'missing' | 'city_removed' | 'damaged' | 'other'>('recovered_all');
  const [notes, setNotes] = useState('');
  const [showRecover, setShowRecover] = useState(false);

  const recover = trpc.signTracker360.recover.useMutation({
    onSuccess: () => { toast('Sign location updated', 'success'); onUpdated(); },
    onError: (e) => toast(e.message, 'error'),
  });

  const navigateUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.location.latitude},${location.location.longitude}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">{location.location.address || location.location.city}</h2>
            <p className="text-sm text-muted-foreground">{location.location.city}, {location.location.state}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Quantity placed</dt><dd className="font-medium">{location.signData.quantityPlaced}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Recovered</dt><dd>{location.signData.quantityRecovered}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Missing</dt><dd>{location.signData.quantityMissing}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt>
            <dd><span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE_CLASSES[location.status]}`}>{STATUS_LABELS[location.status]}</span></dd>
          </div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Type</dt><dd>{PLACEMENT_TYPE_LABELS[location.placementType]}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Placed</dt><dd>{new Date(location.signData.placementDate).toLocaleDateString()}</dd></div>
        </dl>

        {location.photos[0] && (
          <img src={location.photos[0].imageUrl} alt="Sign" className="mt-4 w-full rounded-lg object-cover" />
        )}
        {location.notes && <p className="mt-3 text-sm text-muted-foreground">{location.notes}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          <a href={navigateUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary flex-1">
            <Navigation className="h-4 w-4" /> Navigate
          </a>
          <button type="button" className="btn-primary flex-1" onClick={() => setShowRecover(!showRecover)}>
            Update Status
          </button>
        </div>

        {showRecover && (
          <div className="mt-4 space-y-3 rounded-xl border p-4">
            <label className="block text-sm">
              <span className="text-muted-foreground">Recovery type</span>
              <select className="input mt-1 w-full" value={recoveryType} onChange={(e) => setRecoveryType(e.target.value as typeof recoveryType)}>
                <option value="recovered_all">Recovered All</option>
                <option value="partial_recovery">Partial Recovery</option>
                <option value="missing">Missing</option>
                <option value="city_removed">City Removed</option>
                <option value="damaged">Damaged</option>
                <option value="other">Other</option>
              </select>
            </label>
            {recoveryType === 'partial_recovery' && (
              <>
                <label className="block text-sm">
                  <span className="text-muted-foreground">Recovered qty</span>
                  <input type="number" min={0} className="input mt-1 w-full" value={recovered} onChange={(e) => setRecovered(Number(e.target.value))} />
                </label>
                <label className="block text-sm">
                  <span className="text-muted-foreground">Missing qty</span>
                  <input type="number" min={0} className="input mt-1 w-full" value={missing} onChange={(e) => setMissing(Number(e.target.value))} />
                </label>
              </>
            )}
            <label className="block text-sm">
              <span className="text-muted-foreground">Notes</span>
              <textarea className="input mt-1 w-full" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
            <button
              type="button"
              className="btn-primary w-full"
              disabled={recover.isPending}
              onClick={() => recover.mutate({
                locationId: location.id,
                quantityRecovered: recovered,
                quantityMissing: missing,
                recoveryType,
                notes: notes || undefined,
              })}
            >
              Save Recovery
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

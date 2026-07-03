'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { formatCurrency } from '@clcrm/ui';
import { LoadingState } from '@/components/ui/states';
import { AuthenticatedImage } from '@/components/authenticated-image';
import type { StoredItemCondition } from '@clcrm/types';

async function uploadImageFile(file: File, folder: string) {
  const form = new FormData();
  form.append('file', file);
  form.append('folder', folder);
  const res = await fetch('/api/upload', { method: 'POST', body: form, credentials: 'include' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Upload failed');
  return (data.path ?? data.url) as string;
}

const STATUS_OPTIONS = [
  { value: 'stored', label: 'Stored' },
  { value: 'pulled', label: 'Pulled' },
  { value: 'discarded', label: 'Discarded' },
  { value: 'returned', label: 'Returned' },
];

const CONDITION_OPTIONS = [
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'discard', label: 'Discard' },
];

export function StorageRecordDetail({ recordId }: { recordId: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data, isLoading, refetch } = trpc.storage360.records.getById.useQuery({ recordId });
  const updateRecord = trpc.storage360.records.update.useMutation({
    onSuccess: () => { toast('Storage record updated', 'success'); refetch(); },
    onError: () => toast('Could not update record', 'error'),
  });
  const createItem = trpc.storage360.items.create.useMutation({
    onSuccess: () => { toast('Item added', 'success'); refetch(); setShowItemForm(false); },
    onError: () => toast('Could not add item', 'error'),
  });
  const updateItem = trpc.storage360.items.update.useMutation({
    onSuccess: () => { toast('Item updated', 'success'); refetch(); },
  });

  const [binForm, setBinForm] = useState<{ binNumber: string; locationId: string; rack: string; shelf: string } | null>(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [itemForm, setItemForm] = useState({ name: '', quantity: 1, condition: 'good' as StoredItemCondition, notes: '' });

  if (isLoading || !data) return <LoadingState message="Loading storage record..." />;

  const { record, items, customerName, propertyAddress } = data;
  const bin = binForm ?? {
    binNumber: record.binNumber,
    locationId: record.locationId,
    rack: record.rack ?? '',
    shelf: record.shelf ?? '',
  };

  async function handlePhotoUpload(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) {
      toast('Please choose an image file', 'error');
      return;
    }
    setUploading(true);
    try {
      const path = await uploadImageFile(file, `storage/${recordId}`);
      await updateRecord.mutateAsync({
        recordId,
        photos: [...record.photos, path],
      });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/app/storage" className="text-sm text-muted-foreground hover:text-primary">← Storage hub</Link>
          <h1 className="mt-1 text-2xl font-bold">{customerName}</h1>
          {propertyAddress && <p className="text-muted-foreground">{propertyAddress}</p>}
          <p className="mt-1 text-sm capitalize text-muted-foreground">
            {record.storageType.replace(/_/g, ' ')} · Stored {record.storedAt.toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/app/customers/${record.customerId}`} className="btn-secondary text-sm">Customer profile</Link>
          {record.jobId && (
            <Link href={`/app/jobs/${record.jobId}`} className="btn-secondary text-sm">Source job</Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4 p-6">
          <h2 className="font-semibold">Bin assignment</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input placeholder="Bin number" value={bin.binNumber} onChange={(e) => setBinForm({ ...bin, binNumber: e.target.value })} className="input" />
            <input placeholder="Location / warehouse" value={bin.locationId} onChange={(e) => setBinForm({ ...bin, locationId: e.target.value })} className="input" />
            <input placeholder="Rack" value={bin.rack} onChange={(e) => setBinForm({ ...bin, rack: e.target.value })} className="input" />
            <input placeholder="Shelf" value={bin.shelf} onChange={(e) => setBinForm({ ...bin, shelf: e.target.value })} className="input" />
          </div>
          <button
            type="button"
            className="btn-primary"
            disabled={updateRecord.isPending}
            onClick={() => updateRecord.mutate({ recordId, ...bin })}
          >
            Save location
          </button>
        </div>

        <div className="card space-y-4 p-6">
          <h2 className="font-semibold">Status & fees</h2>
          <select
            value={record.status}
            onChange={(e) => updateRecord.mutate({ recordId, status: e.target.value as typeof record.status })}
            className="input"
          >
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <textarea
            placeholder="Condition notes / damage"
            defaultValue={record.conditionNotes ?? ''}
            onBlur={(e) => {
              if (e.target.value !== (record.conditionNotes ?? '')) {
                updateRecord.mutate({ recordId, conditionNotes: e.target.value });
              }
            }}
            className="input min-h-[80px]"
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Storage fee</label>
            <input
              type="number"
              min={0}
              step={1}
              defaultValue={record.storageFeeCents != null ? record.storageFeeCents / 100 : ''}
              onBlur={(e) => {
                const cents = e.target.value ? Math.round(Number(e.target.value) * 100) : null;
                if (cents !== record.storageFeeCents) {
                  updateRecord.mutate({ recordId, storageFeeCents: cents });
                }
              }}
              className="input w-32"
              placeholder="0.00"
            />
            {record.storageFeeCents != null && (
              <span className="text-sm text-muted-foreground">{formatCurrency(record.storageFeeCents)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Condition photos</h2>
          <label className="btn-secondary cursor-pointer text-sm">
            {uploading ? 'Uploading…' : 'Add photo'}
            <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => handlePhotoUpload(e.target.files?.[0])} />
          </label>
        </div>
        {record.photos.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {record.photos.map((photo, idx) => (
              <div key={idx} className="aspect-square overflow-hidden rounded-lg border">
                <AuthenticatedImage value={photo} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Upload photos documenting item condition at intake.</p>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold">Stored items</h2>
          <button type="button" className="btn-primary text-sm" onClick={() => setShowItemForm(!showItemForm)}>
            {showItemForm ? 'Cancel' : 'Add item'}
          </button>
        </div>
        {showItemForm && (
          <form
            className="grid gap-3 border-b p-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              createItem.mutate({ recordId, ...itemForm });
            }}
          >
            <input required placeholder="Item name" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} className="input" />
            <input type="number" min={1} value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: Number(e.target.value) })} className="input" />
            <select value={itemForm.condition} onChange={(e) => setItemForm({ ...itemForm, condition: e.target.value as StoredItemCondition })} className="input">
              {CONDITION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input placeholder="Notes" value={itemForm.notes} onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })} className="input" />
            <button type="submit" className="btn-primary sm:col-span-2" disabled={createItem.isPending}>Save item</button>
          </form>
        )}
        <table className="data-table">
          <thead>
            <tr><th>Item</th><th>Qty</th><th>Condition</th><th>Notes</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="font-medium">{item.name}</td>
                <td>{item.quantity}</td>
                <td className="capitalize">{item.condition}</td>
                <td className="text-muted-foreground">{item.notes ?? '—'}</td>
                <td>
                  {item.condition !== 'damaged' && (
                    <button
                      type="button"
                      className="btn-ghost text-xs"
                      onClick={() => updateItem.mutate({ recordId, itemId: item.id, condition: 'damaged' })}
                    >
                      Mark damaged
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No items in this storage record.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

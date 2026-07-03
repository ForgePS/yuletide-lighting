'use client';

import { useState } from 'react';
import { AuthenticatedImage } from '@/components/authenticated-image';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { useToast } from '@/lib/toast';

export function SettingsLoading({ message = 'Loading settings...' }: { message?: string }) {
  return <LoadingState message={message} />;
}

export function SettingsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <ErrorState message={message} onRetry={onRetry} />;
}

export function SettingsSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function SaveButton({ saving, label = 'Save changes' }: { saving: boolean; label?: string }) {
  return (
    <button type="submit" className="btn-primary" disabled={saving}>
      {saving ? 'Saving...' : label}
    </button>
  );
}

export function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
      <span className="text-sm">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
    </label>
  );
}

export function useSettingsSave(onSuccess?: () => void) {
  const { toast } = useToast();
  return {
    onSuccess: () => {
      toast('Settings saved', 'success');
      onSuccess?.();
    },
    onError: (err: { message?: string }) => {
      let message = err.message ?? 'Failed to save settings';
      if (message.startsWith('[')) {
        try {
          const issues = JSON.parse(message) as Array<{ path?: string[]; message?: string }>;
          if (Array.isArray(issues) && issues.length > 0) {
            message = issues.map((i) => `${(i.path ?? []).join('.') || 'field'}: ${i.message ?? 'invalid'}`).join('; ');
          }
        } catch {
          /* keep raw message */
        }
      }
      toast(message, 'error');
    },
  };
}

export function LogoUploadField({
  label,
  value,
  onChange,
  folder = 'branding',
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Please choose an image file', 'error');
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', folder);
      const res = await fetch('/api/upload', { method: 'POST', body: form, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      onChange(data.path ?? data.url);
      toast('Logo uploaded', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  }

  return (
    <FormField label={label}>
      <div className="space-y-3">
        {value ? (
          <AuthenticatedImage
            value={value}
            alt={label}
            className="h-16 max-w-[200px] rounded border border-border bg-white object-contain p-2"
            fallback={(
              <div className="flex h-16 w-40 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground">
                No logo
              </div>
            )}
          />
        ) : (
          <div className="flex h-16 w-40 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground">
            No logo
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <label className="btn-secondary cursor-pointer text-sm">
            {uploading ? 'Uploading...' : 'Upload image'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <input
            className="input min-w-[200px] flex-1 text-sm"
            placeholder="Or paste image URL"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </div>
    </FormField>
  );
}

export function KpiGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="card p-4">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className="mt-1 text-lg font-semibold">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

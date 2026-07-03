'use client';

import { useCallback, useState } from 'react';
import { Camera, ImageIcon, Loader2, Trash2 } from 'lucide-react';
import type { PropertyGalleryPhoto } from '@clcrm/types';
import { AuthenticatedImage } from '@/components/authenticated-image';
import { useToast } from '@/lib/toast';
import { cn } from '@clcrm/ui';

async function uploadImageFile(file: File, folder: string) {
  const form = new FormData();
  form.append('file', file);
  form.append('folder', folder);
  const res = await fetch('/api/upload', { method: 'POST', body: form, credentials: 'include' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Upload failed');
  return (data.path ?? data.url) as string;
}

export function PropertyPhotoUploader({
  photos,
  onChange,
  folder = 'properties',
  uploadedBy,
}: {
  photos: PropertyGalleryPhoto[];
  onChange: (photos: PropertyGalleryPhoto[]) => void;
  folder?: string;
  uploadedBy?: string;
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(
    async (file: File | undefined, label = '') => {
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        toast('Please choose an image file', 'error');
        return;
      }
      setUploading(true);
      try {
        const url = await uploadImageFile(file, folder);
        onChange([
          ...photos,
          {
            id: crypto.randomUUID(),
            url,
            label: label || undefined,
            uploadedBy: uploadedBy ?? undefined,
            uploadedAt: new Date(),
          },
        ]);
        toast('Photo uploaded', 'success');
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Upload failed', 'error');
      } finally {
        setUploading(false);
      }
    },
    [folder, onChange, photos, toast, uploadedBy],
  );

  function updateLabel(id: string, label: string) {
    onChange(photos.map((p) => (p.id === id ? { ...p, label } : p)));
  }

  function removePhoto(id: string) {
    onChange(photos.filter((p) => p.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo) => (
          <div key={photo.id} className="card overflow-hidden p-0">
            <div className="aspect-[4/3] bg-muted/30">
              <AuthenticatedImage
                value={photo.url}
                alt={photo.label ?? 'Property photo'}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="space-y-2 p-3">
              <input
                className="input text-sm"
                placeholder="Label (e.g. front elevation)"
                value={photo.label ?? ''}
                onChange={(e) => updateLabel(photo.id, e.target.value)}
              />
              <button
                type="button"
                className="btn-ghost flex w-full items-center justify-center gap-1 text-xs text-red-600"
                onClick={() => removePhoto(photo.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8',
          uploading && 'opacity-60',
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void handleFile(e.dataTransfer.files[0]);
        }}
      >
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <>
            <Camera className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Add property photos</p>
            <p className="mt-1 text-xs text-muted-foreground">Drag & drop or use the buttons below</p>
            <div className="mt-4 flex gap-2">
              <label className="btn-primary cursor-pointer text-sm">
                <ImageIcon className="h-4 w-4" />
                Upload photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handleFile(e.target.files?.[0])}
                />
              </label>
              <label className="btn-secondary cursor-pointer text-sm">
                <Camera className="h-4 w-4" />
                Take photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => void handleFile(e.target.files?.[0])}
                />
              </label>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

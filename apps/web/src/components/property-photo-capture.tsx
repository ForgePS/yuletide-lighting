'use client';

import { useCallback, useRef, useState } from 'react';
import { Camera, ImageIcon, Loader2 } from 'lucide-react';
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

export function PropertyPhotoCapture({
  value,
  onChange,
  folder = 'mockups',
  label = 'Property photo',
  className,
}: {
  value: string;
  onChange: (path: string) => void;
  folder?: string;
  label?: string;
  className?: string;
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Please choose an image file', 'error');
      return;
    }

    const blobUrl = URL.createObjectURL(file);
    setLocalPreview(blobUrl);
    setUploading(true);
    try {
      const path = await uploadImageFile(file, folder);
      onChange(path);
      toast('Photo uploaded', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      URL.revokeObjectURL(blobUrl);
      setLocalPreview(null);
      setUploading(false);
    }
  }, [folder, onChange, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    void handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const hasPreview = Boolean(localPreview || value);

  return (
    <div className={cn('space-y-4', className)}>
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/20',
          hasPreview ? 'border-solid' : '',
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="aspect-[4/3] w-full sm:aspect-[16/10]">
          {localPreview ? (
            <img src={localPreview} alt={label} className="h-full w-full object-cover" />
          ) : value ? (
            <AuthenticatedImage
              value={value}
              alt={label}
              className="h-full w-full object-cover"
              fallback={(
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Loading preview...
                </div>
              )}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <Camera className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Capture or upload a property photo</p>
              <p className="mt-1 text-sm text-muted-foreground">Use your camera on site or pick from your library</p>
            </div>
          )}
        </div>

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="btn-primary flex min-h-12 items-center justify-center gap-2 text-sm"
          disabled={uploading}
          onClick={() => cameraRef.current?.click()}
        >
          <Camera className="h-5 w-5" />
          Take photo
        </button>
        <button
          type="button"
          className="btn-secondary flex min-h-12 items-center justify-center gap-2 text-sm"
          disabled={uploading}
          onClick={() => galleryRef.current?.click()}
        >
          <ImageIcon className="h-5 w-5" />
          Photo library
        </button>
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

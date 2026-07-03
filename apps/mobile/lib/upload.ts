import { apiFetch } from './api';

export async function uploadJobPhoto(uri: string, jobId: string) {
  const filename = uri.split('/').pop() ?? `photo-${Date.now()}.jpg`;
  const form = new FormData();
  form.append('file', {
    uri,
    name: filename,
    type: 'image/jpeg',
  } as unknown as Blob);
  form.append('folder', `jobs/${jobId}`);

  const res = await apiFetch('/api/upload', { method: 'POST', body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Upload failed');
  return (data.path ?? data.url) as string;
}

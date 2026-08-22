import { NextRequest, NextResponse } from 'next/server';
import { createAuthContext } from '@/lib/auth';
import { assertStaffUploadContract } from '@clcrm/types';
import { uploadPlatformFile } from '@yuletide/firebase';

export async function POST(req: NextRequest) {
  const ctx = await createAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ctx.isPlatformCreator) {
    return NextResponse.json({ error: 'Creator access required' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const folder = (formData.get('folder') as string) ?? 'library';

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    assertStaffUploadContract({
      contentType: file.type,
      sizeBytes: buffer.byteLength,
      folder,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'INVALID_UPLOAD';
    const status = message === 'FILE_TOO_LARGE' ? 413 : 400;
    return NextResponse.json({ error: message }, { status });
  }

  const uploaded = await uploadPlatformFile(folder, buffer, file.type, file.name);

  return NextResponse.json({
    url: uploaded.url,
    path: uploaded.path,
    filename: file.name,
    mimeType: file.type,
    sizeBytes: buffer.byteLength,
    folder,
  });
}

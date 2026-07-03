import { NextRequest, NextResponse } from 'next/server';
import { createAuthContext } from '@/lib/auth';
import { readStorageFile } from '@yuletide/firebase';

export async function GET(req: NextRequest) {
  const ctx = await createAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const path = req.nextUrl.searchParams.get('path');
  if (!path || !path.startsWith(`organizations/${ctx.organizationId}/`)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const file = await readStorageFile(path);
    if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });

    return new NextResponse(new Uint8Array(file.buffer), {
      headers: {
        'Content-Type': file.contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err) {
    console.error('[api/files] read failed', path, err);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}

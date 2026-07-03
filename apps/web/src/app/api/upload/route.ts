import { NextRequest, NextResponse } from 'next/server';
import { createAuthContext } from '@/lib/auth';
import { uploadFile } from '@yuletide/firebase';

export async function POST(req: NextRequest) {
  const ctx = await createAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const folder = (formData.get('folder') as string) ?? 'uploads';

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadFile(ctx.organizationId, folder, buffer, file.type, file.name);

  return NextResponse.json({ url: uploaded.url, path: uploaded.path });
}

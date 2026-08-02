import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Portal file download/preview via short-lived ticket (P2-S5).
 * Does not accept arbitrary Storage paths from the client.
 */
export async function GET(req: NextRequest) {
  const ticket = req.nextUrl.searchParams.get('ticket')?.trim();
  if (!ticket || ticket.length < 16) {
    return NextResponse.json({ error: 'PORTAL_RESOURCE_NOT_FOUND' }, { status: 404 });
  }

  try {
    const { readPortalFileFromTicket } = await import('@yuletide/firebase');
    const file = await readPortalFileFromTicket(ticket);
    if (!file) {
      return NextResponse.json({ error: 'PORTAL_RESOURCE_NOT_FOUND' }, { status: 404 });
    }

    const disposition =
      req.nextUrl.searchParams.get('disposition') === 'attachment' ? 'attachment' : 'inline';
    const safeName = file.filename.replace(/[/\\?%*:|"<>]/g, '_');

    return new NextResponse(new Uint8Array(file.buffer), {
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `${disposition}; filename="${safeName}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'PORTAL_RESOURCE_NOT_FOUND' }, { status: 404 });
  }
}

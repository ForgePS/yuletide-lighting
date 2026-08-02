'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { LoadingState } from '@/components/ui/states';
import { establishPortalSessionCookie } from '@/lib/portal-session-client';

export default function PortalQrAccessPage() {
  const token = useParams().token as string;
  const router = useRouter();
  const [ua] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : undefined,
  );
  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [contact, setContact] = useState('');
  const [code, setCode] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [step, setStep] = useState<'landing' | 'code'>('landing');
  const [hint, setHint] = useState('');

  const { data, isLoading, isError } = trpc.portal360.public.qrLanding.useQuery(
    { token, userAgent: ua },
    { retry: false },
  );

  const sendCode = trpc.portal360.public.qrSendCode.useMutation({
    onSuccess: (res) => {
      if (res.sent) {
        setHint(`Code sent to ${res.maskedDestination}`);
        setStep('code');
      } else {
        setHint(res.reason || 'Could not send code');
      }
    },
    onError: (e) => setHint(e.message),
  });

  const verify = trpc.portal360.public.qrVerify.useMutation({
    onSuccess: (res) => {
      void (async () => {
        try {
          const u = new URL(res.portalUrl, window.location.origin);
          const segments = u.pathname.split('/').filter(Boolean);
          const portalIdx = segments.indexOf('portal');
          const accessToken =
            portalIdx >= 0 && segments[portalIdx + 1] && segments[portalIdx + 1] !== 'access'
              ? segments[portalIdx + 1]
              : null;
          if (accessToken && accessToken.length >= 8) {
            await establishPortalSessionCookie(accessToken);
          }
        } catch {
          // Session cookie is best-effort; magic URL still works.
        }
        if (res.deepLinkPath) {
          router.replace(res.deepLinkPath);
          return;
        }
        try {
          const u = new URL(res.portalUrl, window.location.origin);
          router.replace(`${u.pathname}${u.search}${u.hash}`);
        } catch {
          window.location.assign(res.portalUrl);
        }
      })();
    },
    onError: (e) => setHint(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 p-4">
        <LoadingState message="Validating access code..." />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <BlockedCard
        companyName="Yuletide Lighting"
        brandColor="#B91C1C"
        message="This portal access code is no longer active. Please contact Yuletide Lighting Company for assistance."
        diagnosticReference="QR-UNKNOWN"
      />
    );
  }

  const color = data.brandColor || '#B91C1C';

  if (!data.ok || data.flow === 'blocked') {
    return (
      <BlockedCard
        companyName={data.companyName}
        brandColor={color}
        logoUrl={data.logoUrl}
        message={data.message || 'This portal access code is no longer active.'}
        supportPhone={data.supportPhone}
        supportEmail={data.supportEmail}
        diagnosticReference={data.diagnosticReference}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-stone-100 via-white to-red-50/50">
      <div className="flex flex-1 flex-col justify-center px-4 py-10">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          {data.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.logoUrl} alt="" className="mx-auto mb-4 h-12 w-auto object-contain" />
          ) : null}
          <p className="text-center text-xs font-medium uppercase tracking-wide text-stone-500">
            Customer portal
          </p>
          <h1 className="mt-2 text-center text-2xl font-bold" style={{ color }}>
            {data.companyName}
          </h1>

          {data.flow === 'activation' && (
            <>
              <p className="mt-6 text-center text-base text-stone-800">
                Welcome to your customer portal
              </p>
              {data.maskedAccountName && (
                <p className="mt-3 text-center text-sm text-stone-600">
                  Account:{' '}
                  <span className="font-medium text-stone-900">{data.maskedAccountName}</span>
                </p>
              )}
              {data.maskedProperty && (
                <p className="mt-1 text-center text-sm text-stone-600">
                  Property:{' '}
                  <span className="font-medium text-stone-900">{data.maskedProperty}</span>
                </p>
              )}
              <p className="mt-4 text-center text-sm text-stone-500">{data.message}</p>
            </>
          )}

          {data.flow === 'sign_in' && (
            <p className="mt-6 text-center text-sm text-stone-600">
              {data.message ||
                'Sign in with the email or phone on your account to continue. This QR code does not keep you signed in permanently.'}
            </p>
          )}

          {step === 'landing' && (
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                sendCode.mutate({ token, channel, contact, userAgent: ua });
              }}
            >
              {(data.channels?.length ?? 0) > 0 && data.flow === 'activation' && (
                <div className="rounded-xl bg-stone-50 p-3 text-xs text-stone-600">
                  On file: {data.channels!.map((c) => c.masked).join(' · ')}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`min-h-11 flex-1 rounded-xl border text-sm font-medium ${channel === 'email' ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200'}`}
                  onClick={() => setChannel('email')}
                >
                  Email
                </button>
                <button
                  type="button"
                  className={`min-h-11 flex-1 rounded-xl border text-sm font-medium ${channel === 'sms' ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200'}`}
                  onClick={() => setChannel('sms')}
                >
                  Phone
                </button>
              </div>
              <label className="block text-sm">
                <span className="font-medium">
                  {channel === 'email' ? 'Email on file' : 'Phone on file'}
                </span>
                <input
                  className="input mt-1 w-full min-h-11 text-base"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  inputMode={channel === 'email' ? 'email' : 'tel'}
                  autoComplete={channel === 'email' ? 'email' : 'tel'}
                  required
                  placeholder={channel === 'email' ? 'name@example.com' : '(555) 555-5555'}
                />
              </label>
              <button
                type="submit"
                className="btn-primary w-full min-h-12 text-base"
                style={{ backgroundColor: color }}
                disabled={sendCode.isPending}
              >
                {sendCode.isPending ? 'Sending…' : 'Send verification code'}
              </button>
            </form>
          )}

          {step === 'code' && (
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                verify.mutate({ token, code, acceptTerms, userAgent: ua });
              }}
            >
              <label className="block text-sm">
                <span className="font-medium">Verification code</span>
                <input
                  className="input mt-1 w-full min-h-11 text-center text-lg tracking-widest"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                />
              </label>
              <label className="flex items-start gap-3 text-sm text-stone-700">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  required
                />
                <span>
                  I accept the customer portal terms and confirm I am authorized for this account.
                </span>
              </label>
              <button
                type="submit"
                className="btn-primary w-full min-h-12 text-base"
                style={{ backgroundColor: color }}
                disabled={verify.isPending || !acceptTerms}
              >
                {verify.isPending ? 'Verifying…' : 'Verify & open portal'}
              </button>
              <button
                type="button"
                className="w-full text-sm text-primary hover:underline"
                onClick={() => setStep('landing')}
              >
                Use a different email or phone
              </button>
            </form>
          )}

          {hint && <p className="mt-4 text-center text-sm text-stone-600">{hint}</p>}

          <p className="mt-6 text-center text-[11px] text-stone-400">
            Ref {data.diagnosticReference}. QR codes identify your account and start access — they
            are not a permanent login.
          </p>
        </div>
      </div>
    </div>
  );
}

function BlockedCard({
  companyName,
  brandColor,
  logoUrl,
  message,
  supportPhone,
  supportEmail,
  diagnosticReference,
}: {
  companyName: string;
  brandColor: string;
  logoUrl?: string | null;
  message: string;
  supportPhone?: string | null;
  supportEmail?: string | null;
  diagnosticReference: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 p-4">
      <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="mx-auto mb-4 h-10 w-auto object-contain" />
        ) : null}
        <h1 className="text-xl font-bold" style={{ color: brandColor }}>
          {companyName}
        </h1>
        <p className="mt-4 text-sm text-stone-700">{message}</p>
        {(supportPhone || supportEmail) && (
          <p className="mt-4 text-sm text-stone-600">
            {supportPhone && <span className="block">{supportPhone}</span>}
            {supportEmail && <span className="block">{supportEmail}</span>}
          </p>
        )}
        <Link
          href="/portal/login"
          className="mt-6 inline-block text-sm text-primary hover:underline"
        >
          Return to sign-in
        </Link>
        <p className="mt-4 text-[11px] text-stone-400">
          Diagnostic reference: {diagnosticReference}
        </p>
      </div>
    </div>
  );
}

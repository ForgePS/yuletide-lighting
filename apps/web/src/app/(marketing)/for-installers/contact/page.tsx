import type { Metadata } from 'next';
import Link from 'next/link';
import { CrmContactForm, CrmMarketingFooter, CrmMarketingHeader } from '@/components/crm-marketing';
import { CRM_PRODUCT } from '@/lib/crm-marketing';
import { Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Request a Yuletide CRM demo or ask questions about onboarding your install company.',
};

export default function CrmContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <CrmMarketingHeader dark={false} />
      <main className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Get in touch</p>
            <h1 className="font-display mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              Let&apos;s talk about your season
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Whether you&apos;re switching from spreadsheets or evaluating CRMs before peak season, we&apos;re happy to walk you through the platform.
            </p>

            <div className="mt-8 space-y-4">
              <a
                href={`mailto:${CRM_PRODUCT.supportEmail}`}
                className="card flex items-center gap-4 p-5 transition-colors hover:border-primary/30"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Email us</p>
                  <p className="text-sm text-muted-foreground">{CRM_PRODUCT.supportEmail}</p>
                </div>
              </a>
              <p className="text-sm text-muted-foreground">
                Prefer to dive in?{' '}
                <Link href="/sign-up" className="text-primary hover:underline">Start your free trial</Link>{' '}
                — no credit card required.
              </p>
            </div>
          </div>

          <CrmContactForm />
        </div>
      </main>
      <CrmMarketingFooter />
    </div>
  );
}

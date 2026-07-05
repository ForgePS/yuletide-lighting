import { MarketingHeader } from '@/components/marketing-header';
import { MarketingFooter } from '@/components/marketing-footer';
import { MobileCallBar } from '@/components/marketing/mobile-call-bar';
import { HeroSection } from '@/components/marketing/sections/hero-section';
import { TrustBar } from '@/components/marketing/sections/trust-bar';
import { ServicesPreviewSection } from '@/components/marketing/sections/services-preview';
import { ProcessSection } from '@/components/marketing/sections/process-section';
import { ServiceAreaSection } from '@/components/marketing/sections/service-area-section';
import { TestimonialsSection } from '@/components/marketing/sections/testimonials-section';
import { FaqSection } from '@/components/marketing/sections/faq-section';
import { CtaSection } from '@/components/marketing/sections/cta-section';
import type { HomeContent } from '@/lib/marketing-content-types';

export function HomePageView({ home }: { home: HomeContent }) {
  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      <MarketingHeader dark />
      <main>
        <HeroSection home={home} />
        <TrustBar />
        <ServicesPreviewSection />
        <ProcessSection />
        <ServiceAreaSection />
        <TestimonialsSection />
        <FaqSection />
        <CtaSection title={home.ctaTitle ?? undefined} body={home.ctaBody ?? undefined} button={home.ctaButton ?? undefined} />
      </main>
      <MarketingFooter tagline={home.footerText ?? undefined} />
      <MobileCallBar />
    </div>
  );
}

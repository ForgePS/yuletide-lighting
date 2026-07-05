import type { Metadata } from 'next';
import {
  CrmCtaSection,
  CrmFaqSection,
  CrmHeroSection,
  CrmMarketingFooter,
  CrmMarketingHeader,
  CrmModulesPreview,
  CrmTestimonialsSection,
  CrmWorkflowSection,
} from '@/components/crm-marketing';
import { CRM_PRODUCT } from '@/lib/crm-marketing';

export const metadata: Metadata = {
  title: 'Yuletide CRM — Software for Christmas Light Installers',
  description: CRM_PRODUCT.tagline,
  openGraph: {
    title: 'Yuletide CRM for Christmas Light Companies',
    description: CRM_PRODUCT.tagline,
  },
};

export default function ForInstallersPage() {
  return (
    <div className="min-h-screen bg-background">
      <CrmMarketingHeader />
      <CrmHeroSection />
      <CrmModulesPreview />
      <CrmWorkflowSection />
      <CrmTestimonialsSection />
      <CrmFaqSection />
      <CrmCtaSection />
      <CrmMarketingFooter />
    </div>
  );
}

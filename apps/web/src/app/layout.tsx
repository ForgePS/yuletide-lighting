import type { Metadata, Viewport } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#0c1222',
};

export const metadata: Metadata = {
  title: {
    default: 'Yuletide Lighting Co. — Christmas Light Installation in Arkansas',
    template: '%s | Yuletide Lighting Co.',
  },
  description:
    'Professional Christmas light installation for homes and businesses in Eastern & Southeast Arkansas. Custom design, install, takedown, and storage. Call 870-588-7841.',
  keywords: ['Christmas lights', 'holiday lighting', 'Arkansas', 'DeWitt', 'Stuttgart', 'Pine Bluff', 'light installation'],
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Yuletide Lighting Co.',
    title: 'Yuletide Lighting Co. — Christmas Light Installation',
    description: 'Custom holiday lighting across Eastern & Southeast Arkansas.',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Yuletide',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import { DM_Sans } from 'next/font/google';
import { FirebaseAuthProvider } from '@/lib/firebase-auth';
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
  themeColor: '#DC2626',
};

export const metadata: Metadata = {
  title: 'Yuletide Lighting Co. — Christmas Light Business Software',
  description:
    'All-in-one CRM for Christmas light installers. Proposals, invoicing, inventory, scheduling, and crew management.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Yuletide',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body className="font-sans">
        <FirebaseAuthProvider>{children}</FirebaseAuthProvider>
      </body>
    </html>
  );
}

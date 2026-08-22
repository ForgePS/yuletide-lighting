import type { Metadata, Viewport } from 'next';
import { Public_Sans } from 'next/font/google';
import { FirebaseAuthProvider } from '@/lib/firebase-auth';
import './globals.css';

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#696cff',
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
    <html lang="en" className={publicSans.variable} suppressHydrationWarning>
      <body className="font-sans" suppressHydrationWarning>
        <FirebaseAuthProvider>{children}</FirebaseAuthProvider>
      </body>
    </html>
  );
}

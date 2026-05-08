import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { FinanceProvider } from '@/store/FinanceContext';
import { AuthProvider } from '@/store/AuthContext';
import { NotificationProvider } from '@/store/NotificationContext';
import { WorkProvider } from '@/store/WorkContext';
import { QuoteProvider } from '@/store/QuoteContext';
import { FirebaseStatusProvider } from '@/store/FirebaseStatusContext';
import { AppShell } from '@/components/AppShell';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Ivory Tech Solutions | Finance Management',
  description: 'Ivory Tech Solutions — Internal Finance Management Tool',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning className="min-h-full bg-[#09090b] text-zinc-100 overflow-hidden">
        <FirebaseStatusProvider>
          <AuthProvider>
            <NotificationProvider>
              <WorkProvider>
                <FinanceProvider>
                  <QuoteProvider>
                    <AppShell>{children}</AppShell>
                  </QuoteProvider>
                </FinanceProvider>
              </WorkProvider>
            </NotificationProvider>
          </AuthProvider>
        </FirebaseStatusProvider>
      </body>
    </html>
  );
}


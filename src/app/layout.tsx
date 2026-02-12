
import type { Metadata } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { Header } from '@/components/header';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { AuthGate } from '@/components/auth-gate';
import { SearchProvider } from '@/components/search-provider';
import { HymnSearchDialog } from '@/components/hymn-search-dialog';

export const metadata: Metadata = {
  title: {
    default: 'Cantor',
    template: '%s | Cantor',
  },
  description: 'An app to learn Coptic hymns',
  openGraph: {
    title: 'Cantor',
    description: 'An app to learn Coptic hymns',
    siteName: 'Cantor',
    locale: 'en-US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cantor',
    description: 'An app to learn Coptic hymns',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Alegreya:wght@400;700&family=Noto+Sans+Coptic&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <AuthGate>
            <SearchProvider>
              <div className="relative flex min-h-screen flex-col">
                <Header />
                <main className="flex-1">{children}</main>
              </div>
              <HymnSearchDialog />
            </SearchProvider>
            <Toaster />
          </AuthGate>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}

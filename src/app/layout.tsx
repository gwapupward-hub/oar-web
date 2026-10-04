import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import '@fontsource-variable/geist-mono';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'OAR Explorer — Devnet', template: '%s · OAR Explorer' },
  description: 'Look up Solana apps, programs, domains and repositories in the Open App Registry. Every link is checked live, from both sides.',
  // The deployed commit (set by Vercel), so the post-deploy smoke test knows which build it is checking.
  ...(process.env.VERCEL_GIT_COMMIT_SHA && { other: { 'oar-web-commit': process.env.VERCEL_GIT_COMMIT_SHA } }),
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#07111F' },
    { media: '(prefers-color-scheme: light)', color: '#F5F8FC' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <SiteHeader />
        <main id="main" className="container">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

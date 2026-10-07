import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import '@fontsource-variable/geist-mono';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from '@/lib/site';
import { pageMetadata } from '@/lib/seo';
import './globals.css';

export const metadata: Metadata = {
  ...pageMetadata(SITE_TITLE, SITE_DESCRIPTION, '/'),
  metadataBase: new URL(SITE_URL),
  // Canonicals belong to each page, so error pages cannot inherit the homepage canonical.
  alternates: undefined,
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION ? { 'msvalidate.01': process.env.BING_SITE_VERIFICATION } : undefined,
  },
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

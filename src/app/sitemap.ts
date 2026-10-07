import type { MetadataRoute } from 'next';
import { getApp, getProgram } from '@/lib/explorer';
import { ttlCache } from '@/lib/cache';
import { sitemapEntries } from '@/lib/seo';
import { EXAMPLE_APP_ID, OAR_REGISTRY_PROGRAM } from '@/lib/site';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const cache = ttlCache<MetadataRoute.Sitemap>(60 * 60_000, 1);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (process.env.VERCEL_ENV === 'preview') return [];
  return cache('sitemap', async () => {
    // An RPC outage must not prevent discovery of the public informational pages.
    const [app, program] = await Promise.allSettled([getApp(EXAMPLE_APP_ID), getProgram(OAR_REGISTRY_PROGRAM)]);
    return sitemapEntries(app.status === 'fulfilled' ? app.value : null, program.status === 'fulfilled' ? program.value : null);
  });
}

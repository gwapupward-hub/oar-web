import type { Metadata, MetadataRoute } from 'next';
import type { AppView } from './display';
import type { ProgramView } from './explorer';
import { EXAMPLE_APP_ID, OAR_REGISTRY_PROGRAM, OAR_REPO_URL, SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from './site';

const image = { url: `${SITE_URL}/social/oar-card.png`, width: 1200, height: 630, alt: 'Open App Registry — Verifiable application identity for Solana. Devnet.' };

export function pageMetadata(title: string, description: string, path: string, index = true): Metadata {
  const url = new URL(path, SITE_URL).href;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    robots: { index: index && process.env.VERCEL_ENV !== 'preview', follow: true },
    openGraph: { type: 'website', siteName: 'Open App Registry', locale: 'en_US', title, description, url, images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

/** Valid manifests are claims, not safety endorsements. Keep that distinction in snippets too. */
export function appMetadata(appId: string, app: AppView | null): Metadata {
  const name = app ? `${app.unverified ? 'Unverified ' : ''}${app.title}` : 'App not found';
  return pageMetadata(
    `${name} — Solana App ID | OAR`,
    `View App ID ${appId} on Solana Devnet: manifest, programs, domains and source link evidence. Links show control, not safety or endorsement.`,
    `/app/${encodeURIComponent(appId)}`,
    Boolean(app?.manifest.ok && app.status === 'Active'),
  );
}

export function programMetadata(programId: string, view: ProgramView | null): Metadata {
  const name = view?.link?.name || programId;
  return pageMetadata(
    `${name} — Solana Program Link | OAR`,
    `Inspect program ${programId} and its OAR App ID backlink on Solana Devnet. Both sides must agree; link evidence is not a security endorsement.`,
    `/program/${encodeURIComponent(programId)}`,
    Boolean(view?.app.manifest.ok && view.app.status === 'Active' && view.link?.state === 'verified'),
  );
}

/** Curated discovery to start: do not turn arbitrary permissionless registrations into sitemap spam. */
export function sitemapEntries(app: AppView | null, program: ProgramView | null): MetadataRoute.Sitemap {
  const paths = ['/', '/about', '/register'];
  if (app?.appId === EXAMPLE_APP_ID && app.manifest.ok && app.status === 'Active') paths.push(`/app/${EXAMPLE_APP_ID}`);
  if (program?.program === OAR_REGISTRY_PROGRAM && program.app.appId === EXAMPLE_APP_ID &&
      program.app.manifest.ok && program.app.status === 'Active' && program.link?.state === 'verified') {
    paths.push(`/program/${OAR_REGISTRY_PROGRAM}`);
  }
  // No invented lastmod timestamps: chain slots do not provide reliable content modification dates.
  return paths.map(path => ({ url: new URL(path, SITE_URL).href }));
}

export const websiteSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: 'Open App Registry', alternateName: 'OAR', url: SITE_URL, description: SITE_DESCRIPTION, sameAs: [OAR_REPO_URL] },
    { '@type': 'WebApplication', '@id': `${SITE_URL}/#explorer`, name: 'OAR Explorer', url: SITE_URL, description: SITE_DESCRIPTION, applicationCategory: 'DeveloperApplication', operatingSystem: 'Web', isPartOf: { '@id': `${SITE_URL}/#website` } },
  ],
};

export const homeMetadata = pageMetadata(SITE_TITLE, SITE_DESCRIPTION, '/');

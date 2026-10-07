import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateProofFile } from '@open-app-registry/sdk';
import type { AppView } from '../src/lib/display';
import type { ProgramView } from '../src/lib/explorer';
import { appMetadata, pageMetadata, programMetadata, sitemapEntries, websiteSchema } from '../src/lib/seo';
import robots from '../src/app/robots';
import { EXAMPLE_APP_ID, OAR_REGISTRY_PROGRAM, SITE_URL } from '../src/lib/site';

const app = { appId: EXAMPLE_APP_ID, title: 'Open App Registry', unverified: false, manifest: { ok: true }, status: 'Active' } as AppView;
const program = { program: OAR_REGISTRY_PROGRAM, app, link: { state: 'verified' } } as ProgramView;
const indexable = (metadata: ReturnType<typeof pageMetadata>) => (metadata.robots as { index: boolean }).index;

test('canonical, OG and X URLs use the official origin and preserve the actual page', () => {
  const m = pageMetadata('How it works | OAR', 'Description', '/about');
  assert.deepEqual(m.alternates, { canonical: `${SITE_URL}/about` });
  assert.equal((m.openGraph as { url: string }).url, `${SITE_URL}/about`);
  assert.equal((m.twitter as { card: string }).card, 'summary_large_image');
  assert.equal(indexable(pageMetadata('Search', 'Search', '/search', false)), false);
});

test('invalid, unavailable, retired and one-sided evidence cannot become indexable app/program snippets', () => {
  assert.equal(indexable(appMetadata(EXAMPLE_APP_ID, null)), false);
  assert.equal(indexable(appMetadata(EXAMPLE_APP_ID, { ...app, manifest: { ok: false, reason: 'hash mismatch', errors: [] } })), false);
  assert.equal(indexable(appMetadata(EXAMPLE_APP_ID, { ...app, status: 'Retired' })), false);
  assert.equal(indexable(appMetadata(EXAMPLE_APP_ID, app)), true);
  const m = appMetadata(EXAMPLE_APP_ID, { ...app, unverified: true });
  assert.match((m.title as { absolute: string }).absolute, /^Unverified /);
  assert.match(m.description!, /not safety or endorsement/);
  assert.equal(indexable(programMetadata(OAR_REGISTRY_PROGRAM, { ...program, link: null })), false);
  assert.equal(indexable(programMetadata(OAR_REGISTRY_PROGRAM, program)), true);
});

test('curated sitemap admits only the canonical active app and verified program; no query permutations', () => {
  const urls = sitemapEntries(app, program).map(x => x.url);
  assert.deepEqual(urls, [SITE_URL + '/', SITE_URL + '/about', SITE_URL + '/register', `${SITE_URL}/app/${EXAMPLE_APP_ID}`, `${SITE_URL}/program/${OAR_REGISTRY_PROGRAM}`]);
  assert.equal(sitemapEntries(null, null).length, 3);
  assert.equal(sitemapEntries({ ...app, status: 'Retired' }, { ...program, link: null }).length, 3);
  assert.equal(sitemapEntries({ ...app, appId: 'some-other-app' }, null).length, 3);
});

test('robots lets crawlers read search noindex and points to the canonical sitemap', () => {
  assert.deepEqual(robots(), { rules: { userAgent: '*', allow: '/', disallow: '/api/' }, sitemap: SITE_URL + '/sitemap.xml', host: SITE_URL });
});

test('preview deployments block indexing, including page metadata overrides', () => {
  const previous = process.env.VERCEL_ENV;
  try {
    process.env.VERCEL_ENV = 'preview';
    assert.equal(indexable(appMetadata(EXAMPLE_APP_ID, app)), false);
    assert.deepEqual(robots(), { rules: { userAgent: '*', disallow: '/' } });
  } finally {
    if (previous === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previous;
  }
});

test('website schema describes only the explorer; domain proof validates against the actual protocol schema', () => {
  assert.deepEqual(websiteSchema['@graph'].map(x => x['@type']), ['WebSite', 'WebApplication']);
  assert.doesNotMatch(JSON.stringify(websiteSchema), /aggregateRating|review|certification/);
  const proof = JSON.parse(readFileSync('public/.well-known/oar.json', 'utf8'));
  assert.deepEqual(validateProofFile(proof), { valid: true, errors: [] });
  assert.deepEqual(proof.apps, [{ app_id: EXAMPLE_APP_ID, cluster: 'solana:devnet' }]);
});

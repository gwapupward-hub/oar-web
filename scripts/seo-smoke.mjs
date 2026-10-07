// Public, read-only checks against a built server or the official deployment. No credentials.
import assert from 'node:assert/strict';

const base = process.env.BASE_URL || 'http://127.0.0.1:3000';
const canonical = 'https://oarprotocol.xyz';
const get = path => fetch(base + path, { signal: AbortSignal.timeout(60_000) });
const html = async path => { const r = await get(path); assert.equal(r.status, 200, path); return { r, text: await r.text() }; };

for (const path of ['/', '/about', '/register', '/search?q=not-searchable']) {
  const { r, text } = await html(path);
  const pathname = path.split('?')[0];
  // Next.js normalizes the homepage's metadata URL to the bare origin.
  const url = canonical + (pathname === '/' ? '' : pathname);
  assert.ok(text.includes(`<link rel="canonical" href="${url}"`), `canonical ${path}`);
  assert.ok(text.includes(`<meta property="og:url" content="${url}"`), `OG URL ${path}`);
  assert.match(text, /<meta name="twitter:card" content="summary_large_image"/);
  if (path.startsWith('/search')) assert.match(text, /<meta name="robots" content="noindex, follow"/);
  if (path === '/') {
    const match = /<script type="application\/ld\+json" nonce="([^"]+)"[^>]*>([^<]+)<\/script>/.exec(text);
    assert.ok(match, 'structured data carries CSP nonce');
    assert.ok(r.headers.get('content-security-policy')?.includes(`'nonce-${match[1]}'`));
    assert.deepEqual(JSON.parse(match[2])['@graph'].map(x => x['@type']), ['WebSite', 'WebApplication']);
    assert.ok(text.includes('Solana Devnet only; mainnet is not live.'));
  }
  console.log(`ok metadata ${path}`);
}

const robots = await html('/robots.txt');
assert.ok(robots.text.includes(`Sitemap: ${canonical}/sitemap.xml`));
assert.ok(robots.text.includes('Disallow: /api/'));
assert.ok(!robots.text.includes('Disallow: /search'));
console.log('ok robots discovery');
const sitemap = await html('/sitemap.xml');
assert.ok(sitemap.text.includes(`<loc>${canonical}/</loc>`));
assert.ok(!sitemap.text.includes('/search') && !sitemap.text.includes('vercel.app'));
console.log('ok canonical sitemap');
const proof = await get('/.well-known/oar.json');
assert.equal(proof.status, 200);
assert.deepEqual((await proof.json()).apps, [{ app_id: 'Bu1JCyxiVDdDGjtNLLkKhq6KZv6E4LcUgqNkS5t5Nf2K', cluster: 'solana:devnet' }]);
console.log('ok devnet domain proof');
const image = await get('/social/oar-card.png');
assert.equal(image.status, 200);
assert.match(image.headers.get('content-type') || '', /image\/png/);
const bytes = Buffer.from(await image.arrayBuffer());
assert.equal(bytes.readUInt32BE(16), 1200);
assert.equal(bytes.readUInt32BE(20), 630);
console.log('ok 1200x630 social image');
const missing = await get('/app/not-a-solana-address');
assert.equal(missing.status, 404);
assert.match(await missing.text(), /name="robots" content="noindex/);
console.log('ok unknown App ID remains noindex 404');

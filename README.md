# OAR Explorer

An explorer and registration wizard for the [Open App Registry](https://github.com/gwapupward-hub/oar) (OAR): onchain application identity for Solana. It is one client of the OAR protocol, built on the published SDK, and it is not part of the protocol itself.

**Live at https://oarprotocol.xyz. Status: v0, Solana devnet only.**

- It runs against the `v0.1.1-rc.2` release candidate.
- Mainnet appears in the cluster selector but stays disabled until the OAR mainnet gate passes.
- There are no accounts. A wallet connects only on `/register`, where the team signs its own transactions.
- **Appearance** in the header offers Light, Dark and System. System follows the device setting by default;
  explicit choices override it and are saved locally on the device. Changes sync across open tabs.
  A nonce-authorized head script restores the saved theme before paint; blocked storage falls back safely
  to the device setting. Without JavaScript, the existing CSS device preference still applies.

## What it does

Search takes an **App ID**, a **program ID**, a **domain** or a **GitHub repository**.

- **App page:** the onchain record, manifest validity, and one live-checked state per claimed link (`verified`, `attested`, `unverified` or `failed`), following the spec's display rules:
  - there is no single "Verified" badge;
  - the name is prefixed "Unverified" until a domain or program link verifies;
  - a manifest that fails any check shows "metadata unavailable";
  - retired apps show no links;
  - hostnames are shown in punycode, and all manifest text is rendered as plain text;
  - the record authority is not presented as an endorsement.
- **Program page:** follows the program's canonical `oar` backlink to its app. The link is verified only when both sides agree.
- **Domain and repository search** matches claims in registered manifests. A match is a claim, not proof; the app page runs the live checks. Search input is never fetched.
- **Register an app** (`/register`): the browser version of `oar claim` (see the protocol's `docs/REGISTERING.md`).
  1. Connect a Wallet Standard wallet on devnet. It becomes the creator, which determines the App ID.
  2. Describe the app; the page derives the App ID and produces the manifest and proof files to deploy.
  3. Check the deployment. Registration unlocks only when the hosted manifest matches the one being committed.
  4. Sign the `register` transaction, then one link per program: in the wallet when it is the upgrade authority, or as an unsigned proposal for a Squads vault.

  From a phone: phone browsers have no wallet extensions, so the Connect step offers "Open in Phantom" and "Open in Solflare" links. They reopen the page inside the wallet app, where its Wallet Standard wallet is available. Every file can be copied as JSON, because downloads are unreliable in in-app browsers. The manifest address can be set after preparing, for example a public GitHub Gist's Raw URL.

  Already registered: the **Update** card moves an App ID's manifest to a new address, signed by the record's authority. The server reads the manifest at the new address and refuses it unless it is valid for that App ID. A manifest is never accepted at `oar.json`, because a repository's root `oar.json` and a domain's `/.well-known/oar.json` hold the ownership proofs. A raw GitHub link that follows a branch passes the check with a tip to pin it to a commit.

  Safety properties:
  - The server builds unsigned transactions and relays signed ones. It holds no keys and stores nothing.
  - Before every signature, the browser decodes the transaction itself: who pays, and that it calls only the OAR registry, Program Metadata, System and Compute Budget programs (`assertRegistrationInstructions`). The relay refuses anything else.
  - To check the deployment, the server fetches the manifest URI, domains and repositories the team entered, through the SDK's protected transport (public destinations only, bounded time and size).

## How it works

- Next.js (App Router) on the Node.js runtime. All resolution runs on the server, so the browser never talks to the RPC or to app hosts.
- `@open-app-registry/sdk` is installed from the `v0.1.1-rc.2` GitHub release tarball, pinned by URL and by lockfile integrity. Its HTTP transport validates and pins DNS answers, refuses private and special-use addresses, and bounds time and size.
- Every RPC call has a 10-second timeout. Results are cached per instance for 60 seconds, and the search index for 5 minutes, covering at most 200 records.
- Every request gets a nonce-based Content-Security-Policy (`src/proxy.ts`), plus `nosniff`, `DENY` framing and a strict referrer policy.

## Configuration

| Variable | Required | Meaning |
| --- | --- | --- |
| `OAR_DEVNET_RPC_URL` | Production | A dedicated devnet RPC URL, which may contain a provider key. It is read on the server only; never expose it as `NEXT_PUBLIC_*`. If unset, the public devnet endpoint is used, which is suitable for development only. |
| `OAR_TRUSTED_ISSUERS` | No | Comma-separated SAS credential addresses whose OAR attestations count as `attested`. Empty by default, as the spec requires. |
| `GOOGLE_SITE_VERIFICATION` | No | Public HTML verification token for a Google Search Console **URL-prefix** property. A **Domain** property uses the DNS TXT record issued by Google instead. |
| `BING_SITE_VERIFICATION` | No | Public ownership token emitted as the `msvalidate.01` meta tag. Use the actual token issued to the owner's Bing account. |

## Search discovery and verification

The canonical origin is `https://oarprotocol.xyz`. Every public page defines its own canonical, description and
Open Graph/X metadata. Search results are `noindex, follow` but stay crawlable, so bots can read that directive.
Preview deployments are `noindex` and disallow crawling. Invalid/missing/retired manifests are not indexable;
program pages are indexable only when both sides of the link verify.

`/robots.txt` advertises `/sitemap.xml`. The initial sitemap deliberately lists informational pages and the canonical
OAR Devnet app/program only, after their records validate; arbitrary registrations and search query permutations
are excluded. Expand this curation when durable application pages warrant it. Static pages remain discoverable
if the Devnet RPC is unavailable. No invented content modification times are emitted.

The homepage's WebSite/WebApplication JSON-LD uses the existing per-request CSP nonce. No rating, endorsement,
security certification or mainnet claim is present. The 1200×630 share card uses the pinned official OAR mark
and brand colors. No third-party script or new dependency is required.

`/.well-known/oar.json` provides OAR's reciprocal domain proof on `solana:devnet`. The protocol manifest and
onchain record must also list this host before **Domain linked** can appear. Follow the protocol repository's
[`docs/DOMAIN-VERIFICATION.md`](https://github.com/gwapupward-hub/oar/blob/main/docs/DOMAIN-VERIFICATION.md)
with the current record authority; publishing the proof alone is not full verification.

After deploying:

1. In [Google Search Console](https://search.google.com/search-console), add Domain property `oarprotocol.xyz` and
   publish its issued TXT value in Vercel DNS; verify with the owner's Google account. Alternatively, add URL-prefix
   property `https://oarprotocol.xyz/`, configure the issued HTML token, redeploy, and verify.
2. In [Bing Webmaster Tools](https://www.bing.com/webmasters), import the verified Search Console property or
   use its issued verification token. Never fabricate tokens or claim ownership before the service verifies it.
3. Submit `https://oarprotocol.xyz/sitemap.xml` to both tools; request homepage, `/about` and canonical OAR App ID
   indexing through the relevant URL inspection tools. Indexation/ranking are search-engine decisions, not release guarantees.
4. Run the read-only check below and the existing Devnet smoke. Record deployed SHA, date, returned headers,
   TLS/CAA checks and any external scan result. HTTPS already receives Vercel's HSTS header; verify the real response
   rather than reducing its current lifetime. Only enable `includeSubDomains` or preload after validating every subdomain's HTTPS.

   ```bash
   BASE_URL=https://oarprotocol.xyz npm run smoke:seo
   BASE_URL=https://oarprotocol.xyz npm run smoke:devnet
   ```

External checks: [MDN HTTP Observatory](https://developer.mozilla.org/en-US/observatory) and
[SecurityHeaders](https://securityheaders.com/?q=https%3A%2F%2Foarprotocol.xyz&followRedirects=on).
Their results are point-in-time diagnostics, not a protocol or application security audit.

## Develop

```bash
npm ci --ignore-scripts
npm run dev            # http://localhost:3000
npm run typecheck && npm test
npm run build && npm start
BASE_URL=http://127.0.0.1:3000 npm run smoke:devnet   # live checks against OAR's own devnet registration
```

CI (`.github/workflows/ci.yml`) has two jobs:
- **check:** `npm audit`, registry signature verification, the type check, the unit tests and the build;
- **devnet:** serves the built app and runs the live devnet smoke test against OAR's own registration (`Bu1JCyxi…`).

### Brand icons

The favicon and site icons (`src/app/favicon.ico`, `src/app/icon.svg`, `src/app/icon.png`, `public/oar-mark.svg`) are
byte-for-byte copies of the OAR brand kit in [`gwapupward-hub/oar/brand`](https://github.com/gwapupward-hub/oar/tree/main/brand),
pinned by commit and SHA-256 in `brand.lock.json`. Don't edit them by hand. Run `npm run sync:brand [ref]` instead. The unit
tests fail on any drift or on an unpinned icon file, and the smoke test checks that the served icons match the lock.

## Repository protection

Import `.github/rulesets/main.json` under Settings → Rules → Rulesets → New ruleset → Import a ruleset. It enforces:
- changes only through pull requests;
- the `check` job must pass;
- no force pushes or deletion, and no bypass.

The `devnet` job reports on every change but is not required, so an outage of the public devnet RPC cannot block merges.

## Deploy (Vercel)

1. Import this repository in Vercel. The framework is detected as Next.js; keep the defaults.
2. Set `OAR_DEVNET_RPC_URL` for Production and Preview.
3. Deploy. Every successful production deployment then runs the live smoke test against https://oarprotocol.xyz (`.github/workflows/deployed.yml`), after waiting for it to serve the deployed commit. If the domain changes, set the new one as the `OAR_WEB_PRODUCTION_URL` repository variable.
4. Add a rate-limit rule in the Vercel Firewall: Request Path matches `^/($|app/|program/|search|about|register|api/)`, fixed window of 60 seconds, 120 requests per IP, then 429. The app bounds and caches its own work, but per-instance caches are not a rate limit, and `/api/register` triggers RPC calls and outbound checks.

To check any devnet address read-only (an App ID, or the wallet that registered one), run Actions → **Inspect a devnet address** with that address. The report lists the record, the manifest and claim states, and every program its transactions called.

## License

Apache-2.0

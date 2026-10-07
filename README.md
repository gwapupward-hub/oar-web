# OAR Explorer

An explorer and registration wizard for the [Open App Registry](https://github.com/gwapupward-hub/oar) (OAR): onchain application identity for Solana. It is one client of the OAR protocol, built on the published SDK, and it is not part of the protocol itself.

**Status: v0, Solana devnet only.**

- It runs against the `v0.1.1-rc.2` release candidate.
- Mainnet appears in the cluster selector but stays disabled until the OAR mainnet gate passes.
- There are no accounts. A wallet connects only on `/register`, where the team signs its own transactions.

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
3. Deploy. Every successful production deployment then runs the live smoke test against the production URL (`.github/workflows/deployed.yml`), after waiting for that URL to serve the deployed commit. Once a custom domain is assigned, set it as the `OAR_WEB_PRODUCTION_URL` repository variable.
4. Add a rate-limit rule in the Vercel Firewall: Request Path matches `^/($|app/|program/|search|about|register|api/)`, fixed window of 60 seconds, 120 requests per IP, then 429. The app bounds and caches its own work, but per-instance caches are not a rate limit, and `/api/register` triggers RPC calls and outbound checks.

## License

Apache-2.0

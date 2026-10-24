# OAR registration sprint — GitHub PR assist, beta, monitoring

**October 24, 2026.** Code is deployable behind a GitHub App configuration gate; no owner credential, signature, Github installation, or real device test has been claimed by this document.

## 1. Guided GitHub proof PR (optional)

Flow: Prepare an OAR claim with a public GitHub repository → connect your GitHub user account to a narrowly scoped GitHub App → select a repository installed for that app → OAR checks that the default branch has neither root `oar.json` nor `oar-manifest.json` → create a new `oar/claim-<AppID>` branch with just those two files → open a PR for human review.

- The API never pushes to the default branch or merges a PR.
- It writes only fixed file paths in the selected public repo and refuses to replace existing files.
- The returned PR does **not** count as a repository control proof until merged. The manifest must be published at a stable raw URL (pin the full commit SHA after merging), then OAR rechecks it.
- No GitHub token, owner wallet signature, or secret key is exposed to browser JavaScript; the GitHub App user token is kept in an authenticated, encrypted, HttpOnly, SameSite cookie with a one-hour maximum lifetime. OAuth uses random state and PKCE S256.
- OAR remains fully usable with its manual file upload and independent SDK/CLI flow, including repositories not on GitHub.

### Required owner action before live GitHub PR functionality

1. In GitHub Developer Settings, create an OAR GitHub App owned by the intended organization. Set homepage `https://oarprotocol.xyz`, callback `https://oarprotocol.xyz/api/github/callback`.
2. Grant minimum repository permissions: **Contents: read/write** and **Pull requests: read/write**; metadata read is implicit. Do **not** request Administration, Actions, Secrets, Workflows, or any organization-wide permissions.
3. Install the app on **selected repositories only**. The user's authorization never exceeds the intersection of their access and the app's installation permissions. Choose which repositories are eligible; OAR will not install itself.
4. Set these **server-only** Vercel environment variables (do not copy their values to this chat, the repo, PRs, or logs): `OAR_GITHUB_CLIENT_ID`, `OAR_GITHUB_CLIENT_SECRET`, `OAR_GITHUB_APP_SLUG`, `OAR_GITHUB_SESSION_KEY` (32 random bytes encoded as standard base64), `OAR_GITHUB_ORIGIN=https://oarprotocol.xyz`. Redeploy with the variables set.
5. From a selected repository, run a PR dry-run using a fresh **Devnet** App ID, review the diff, merge only after approval, and use `Check again`. Do not provide private keys.

If the GitHub App is not installed or env variables are absent, no connect button appears; the manual flow remains fully supported.

## 2. Mobile device pilots

The five initial GWAP candidates are OAR, GwapSpot OS, GNS, GwapScore and Lil Gwapz. Keep their actual App IDs and creator wallets separate; OAR's earlier rehearsal GNS ID must not be presented as a GNS registration. Do 3–5 real device walkthroughs plus at least one external developer case.

For each: device/browser and wallet, publicly accessible proof URLs, created App ID, each check state, elapsed minutes, error recovery, link to PR (if used), and signed Devnet transaction only if owner deliberately approved it. **Never collect key files, seed phrases, token cookies, or wallet backup data.**

Pass gates: no fake proof-green state; no wallet signing before explicit approval; successful draft transfer on iPhone Safari → wallet browser; exact manifest hash before onchain registration; no unexpected redirects or secret leakage. Check browser prompts and page-hidden watcher behavior on physical hardware. Existing fixture tests are not physical-device evidence.

## 3. Error recovery

Each unresolved proof row offers an inspectable URL where safe (manifest, domain proof, repository, Devnet explorer) and a plain-language fix. These are **links**, not a change to the OAR verifier's actual status. Manual retries and immutable raw manifest guidance remain available.

## 4. Independent external developer beta

Public checklist at `/beta`; optional GitHub issue feedback template, with explicit warning never to post credentials. The beta is open to developers without GWAP accounts or products. Public verifier status cannot be bought or altered by feedback.

## 5. Optional operations monitoring foundation

`/monitoring` and the pure observation policy model distinguish `available`, `unreachable`, `changed`, and `unknown` for infrastructure telemetry. None of these are security opinions or OAR identity-score modifiers.

Before any paid launch, decide alert destinations, monitored app opt-in, consent/privacy retention, uptime intervals, anti-SSRF network protections, deduplication and alert noise budgets, multi-region validation, cost caps, pricing, legal terms and actual SLA operational capacity. No checkout, subscriptions, background workers, billable notifications or service guarantees exist yet. Verification remains free and neutral.

## Sprint acceptance / evidence

- [x] Secure opt-in GitHub App PR workflow behind environment configuration.
- [x] Fixed-file guardrails, no overwrites, manual merge only; tests cover success and refusal.
- [x] Guided proof inspection links and error-recovery tests.
- [x] Public independent beta checklist and voluntary feedback issue template.
- [x] Monitoring operational-status contract and tests, without monetized trust.
- [ ] Owner creates/configures GitHub App and approves its installation.
- [ ] Run real iPhone + Android wallet flows (signatures remain owner-controlled).
- [ ] Complete 3–5 GWAP pilots plus one independent developer case with measured friction.
- [ ] Decide hosting, alert delivery, storage, privacy, billing, and SLA details for paid monitoring.

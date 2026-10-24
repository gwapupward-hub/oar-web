# OAR registration onboarding — five GWAP pilots

**October 24, 2026 — Devnet only.** These are *candidate* pilots, not five newly registered or verified applications. The automated fixture suite in `test/onboarding.test.ts` exercises manifest and ownership-proof generation without signatures or on-chain writes. No special treatment is granted to GWAP applications.

| Candidate | Public identity / domain | Source or integration surface | Starting status |
| --- | --- | --- | --- |
| Open App Registry | `oarprotocol.xyz` | `gwapupward-hub/oar` | Existing signed Devnet registration is the reference fixture; confirm latest proof health. |
| GwapSpot OS | `gwapspot.com` | `gwapupward-hub/gwapspot-web` | Registration pilot pending creator wallet and publication approval. |
| Gwap Name Service | `gwapspot.fun` | GNS site and resolver | Registration pilot pending creator wallet and publication approval. |
| GwapScore | `gwapscore.live` | `gwapupward-hub/GwapScore-Official-v1` | Registration pilot pending creator wallet and publication approval. |
| Lil Gwapz | `lilgwapz.xyz` | `gwapupward-hub/lil-gwapz` | Registration pilot pending creator wallet and publication approval. |

The domains and repositories are input candidates only. A domain claimed in a manifest is *not verified* until its reciprocal proof is publicly served and checked. Project teams may choose different canonical production domains or publishers after reviewing ownership.

## Manual Devnet acceptance route — repeat independently for each app

1. **Phone + wallet:** From iPhone Safari/Android Chrome, open `https://oarprotocol.xyz/register`. Use the Phantom or Solflare deep link, enable Devnet, and connect. If the wallet cannot provide a Devnet account, the UI must explain how to recover. Check that no private key, secret or seed is requested.
2. **Prepare:** Enter app name, optional domain/repo/program, and generate the files. Check the App ID is unique for that creator/nonce, the manifest validates, and the proof JSON names precisely that App ID and `solana:devnet`. Copy the files from the phone and resume in the same wallet browser.
3. **Host:** Publish `oar-manifest.json` at a public immutable HTTPS link (or supported content-addressed URI), domain `/.well-known/oar.json` and repository-root `oar.json` when those proofs are claimed. All URLs must be directly accessible without authentication/challenges/redirects; do not publish a manifest over a proof file.
4. **Check:** Test missing file, wrong JSON, hash mismatch, bad proof, unreachable host and incompatible program authority. Each failing or pending line must offer a specific correction. Manifest must match before the Register button unlocks. Other claims are *pending*, never silently verified.
5. **Owner signature:** The creator chooses to sign the inspected OAR-only registration transaction. **Do not ask an agent to import or handle keys.** Record transaction signature and confirmed slot privately; program upgrades require the *program upgrade authority*, which can be different.
6. **Resolve:** After the explorer refreshes, check manifest hash, App ID, authority, proof state and linked program. Confirm UI says ownership/control rather than security audit; all results must be identical for free, external, and GWAP registrants.

## Evidence and exit criteria

Capture for each pilot: device/browser/wallet, Devnet creator (public address only), generated App ID, prepared URI, host HTTP status and effective URL, individual check rows, time to complete, wallet errors, transaction signature *if owner chooses to sign*, final explorer URL, and friction notes. No secret material.

- Target 3–5 completed human walkthroughs and at least one external non-GWAP walkthrough before calling the flow generally usable.
- 100% of checked manifests must match canonical SHA-256 before signing; 0 false-positive proof states; 0 key-handling requests.
- Measure median elapsed onboarding time, abandonment at each step, and number of correction attempts. There is no credible measured time baseline yet.
- Flag browser/WebKit wallet interactions and signing as **needs device verification** until tested on a physical phone.
- A control proof is not a security audit. OAR verification stays free and neutral and cannot be purchased.

## Current automation boundary

`npm test` exercises 5 standalone manifest/proof fixtures and user-facing error guidance. It does not access owner wallets, publish live proofs, sign transactions, verify live uptime, or assert Mainnet readiness. Such actions require the relevant application's owner to approve or perform them.

## Read-only hosted endpoint preflight — October 24, 2026

A single test runner made HTTPS GET requests to both `/.well-known/oar-manifest.json` and `/.well-known/oar.json` for the five candidate domains. These are observations from that runner, not globally verified uptime or a wallet/device test. Response bodies were inspected in addition to the HTTP status.

| Host | Manifest response | Domain-proof response | Interpretation |
| --- | --- | --- | --- |
| `oarprotocol.xyz` | HTTP 404 HTML | HTTP 200 valid OAR JSON naming `Bu1JCyxiVDdDGjtNLLkKhq6KZv6E4LcUgqNkS5t5Nf2K` | OAR intentionally uses a pinned GitHub manifest URI; its default website manifest URL is not the canonical record URI. |
| `gwapspot.fun` | HTTP 200 JSON, `name: OAR rehearsal`, App ID `ET2mbpPPWH9oksjksVTU8eVUMhsEpq5EuZLq35ZF3fXc` | HTTP 200 matching rehearsal proof JSON | Do not treat these as a new GNS registration. A separately prepared GNS App ID and its corresponding files would be needed. |
| `gwapspot.com` | HTTP 503 upstream connection failure from this runner | HTTP 503 upstream connection failure | Retry from actual hosting and another network; this alone is not conclusive evidence the public production site is down. |
| `gwapscore.live` | HTTP 200 `text/html` site markup | HTTP 200 `text/html` site markup | SPA fallback is **not** an OAR proof; publish specific JSON endpoints that bypass the SPA fallback. |
| `lilgwapz.xyz` | HTTP 200 `text/html` with “Site Unavailable” | Same “Site Unavailable” HTML | Resolve public hosting before starting the signed proof workflow. |

All ten preflight requests completed without a reported HTTP redirect. No live signed registration was created; no owner keys were accessed. **No claim of proof verification for these new pilots is made.** The OAR reference App ID was previously owner-signed and independently documented.

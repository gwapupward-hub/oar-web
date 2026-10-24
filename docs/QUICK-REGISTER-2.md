# Quick Register 2.0a — fewer switches, same owner controls

Status: Phase 2.0a; manual proofs and owner-signed onchain registration remain required. This is not an automated GitHub PR integration.

## Available now

- **Cross-browser resume:** The Deploy step can copy an `OAR2.` resume code containing the prepared app draft, manifest, and public creator address. Connect the **same wallet** in the mobile wallet browser and paste it into the Describe step. No private keys or signing authority are encoded. Treat it as project metadata, not an identity token; do not post it publicly before the app is ready.
- **Repository proof guidance:** Each repository link opens in a new tab. Commit the provided `oar.json` to the root of the public repository's **default branch**. A plain manifest upload does not establish repository control.
- **Publication watcher:** Developers can choose to recheck the external manifest and proofs every 20 seconds while the tab is visible, for up to six attempts; it stops on success, after its limit, or when switched off. This never signs or submits a transaction.
- **Manual recovery:** A user can still download JSON, copy raw JSON, edit a public manifest URI, check again, or use a separate CLI. No GWAP account is needed.

## Devnet acceptance plan

1. Create an unsigned draft in desktop Safari or Chrome; copy a resume code.
2. Open `https://oarprotocol.xyz/register` in an iPhone wallet browser and connect the **same** Devnet creator wallet. Paste the code; verify that App ID, URI and JSON files match the original draft.
3. Attempt import with a **different** wallet; the UI must reject it. Confirm neither flow can sign without a deliberate wallet transaction approval.
4. Test both hosted paths: `https://<domain>/.well-known/oar.json` and a default-branch GitHub root `oar.json`; distinguish an unhosted file from a bad hash and from an unverified repository.
5. Opt into the watcher before publishing. Confirm a successful recheck, the six-attempt limit, page-hidden behavior, and that checks don't make wallet-signing requests.
6. Rehearse on 3–5 independent GWAP properties (OAR, GNS, GwapScore, GwapSpot, Lil Gwapz) only when their actual domains or repository contents are available; keep real signatures owner-controlled. Record mobile completion time, steps, and any error text that blocked a user. Do not silently reuse OAR's existing GNS rehearsal App ID.

## Next optional integration — requires owner authorization

A GitHub App, installed by the developer on a specifically selected repository, could create a branch/PR containing root `oar.json`. Keep permissions narrowly scoped (Contents: read/write and Pull requests: read/write), with an installation-scoped token and explicit review/merge. Never ask users for personal access tokens or upload private wallet keys. The OAR registry, SDK, verifiers, and manual paths must work outside GitHub and GWAP.

## Principles that do not change

- App identity and proof verification remain free, neutral, and independent of paid services.
- Domain/repository control is **not** a security audit or a trusted-party attestation.
- Only the record authority signs onchain registration and manifest updates; the UI cannot sign or forge a proof.

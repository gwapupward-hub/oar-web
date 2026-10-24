'use client';
import { useEffect, useState } from 'react';
import { Check, ExternalLink, LoaderCircle } from 'lucide-react';
import type { PreparedClaim } from '@/lib/register-types';

type Status = { configured: boolean; connected: boolean; installUrl?: string };
type ProofResult = { url: string; branch: string };

export function GitHubProofPublisher({ claim, repositories }: { claim: PreparedClaim; repositories: string[] }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [repository, setRepository] = useState(repositories[0] ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProofResult | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/github/status', { signal: controller.signal, cache: 'no-store' })
      .then(r => r.ok ? r.json() as Promise<Status> : Promise.reject(new Error('Status unavailable')))
      .then(setStatus)
      .catch(() => { if (!controller.signal.aborted) setStatus({ configured: false, connected: false }); });
    return () => controller.abort();
  }, []);
  if (!repositories.length || !status?.configured) return null;

  async function create() {
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const response = await fetch('/api/github/proof-pr', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim, repository }),
      });
      const data = await response.json() as ProofResult & { error?: string };
      if (!response.ok) throw new Error(data.error || `GitHub returned HTTP ${response.status}.`);
      setResult(data);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <section className="github-proof-assist" aria-label="Publish the GitHub proof">
      <h3>Publish your repository proof with a reviewable pull request</h3>
      <p className="small muted">OAR can prepare <code>oar.json</code> and the manifest on a new branch. You choose which repository to authorize and approve the PR on GitHub. Nothing is merged or signed automatically.</p>
      {status.connected ? (
        <>
          <p className="small proof-connected"><Check size={16} aria-hidden="true" /> GitHub connected for this session.</p>
          <label className="field">
            <span>Repository to publish into</span>
            <select value={repository} onChange={e => { setRepository(e.target.value); setError(null); setResult(null); }}>
              {repositories.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <div className="resume-actions">
            <button type="button" className="button" disabled={busy || !!result} onClick={create}>
              {busy ? <LoaderCircle className="spin" size={15} aria-hidden="true" /> : null}
              {busy ? 'Preparing GitHub PR…' : 'Create proof pull request'}
            </button>
            {status.installUrl ? <a className="button button-secondary" target="_blank" rel="noopener noreferrer" href={status.installUrl}>Manage authorized repositories <ExternalLink size={15} aria-hidden="true" /></a> : null}
          </div>
        </>
      ) : (
        <div className="resume-actions">
          <a className="button button-secondary" href="/api/github/connect">Connect GitHub securely <ExternalLink size={15} aria-hidden="true" /></a>
          {status.installUrl ? <a className="link-button" href={status.installUrl} target="_blank" rel="noopener noreferrer">Select repositories for the OAR GitHub App</a> : null}
        </div>
      )}
      {error ? <p className="wizard-error" role="alert">{error} The manual JSON steps above remain available.</p> : null}
      {result ? (
        <div className="callout" role="status">
          <strong>Review the proof PR:</strong> <a href={result.url} target="_blank" rel="noopener noreferrer">{result.url} <ExternalLink size={14} aria-hidden="true" /></a>
          <p className="small">Merge it on GitHub before checking repository control. After merge, pin the manifest’s raw GitHub URL to the merge commit SHA. A PR by itself is not proof.</p>
        </div>
      ) : null}
    </section>
  );
}

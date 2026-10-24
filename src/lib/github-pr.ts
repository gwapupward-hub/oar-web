import 'server-only';
import { prepareGitHubProof } from './github-proof';
import type { PreparedClaim } from './register-types';

class GitHubApiError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

const API = 'https://api.github.com';

async function githubRequest(token: string, endpoint: string, method = 'GET', payload?: unknown): Promise<{ status: number; body: Record<string, unknown> }> {
  // endpoint is composed only from a strict owner/repo parser and fixed paths.
  const response = await fetch(API + endpoint, {
    method,
    headers: {
      Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28', ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  let body: Record<string, unknown>;
  try { body = (await response.json()) as Record<string, unknown>; } catch { body = {}; }
  return { status: response.status, body };
}
function mustSucceed(result: { status: number; body: Record<string, unknown> }, action: string): Record<string, unknown> {
  if (result.status >= 200 && result.status < 300) return result.body;
  const reasons: Record<number, string> = {
    401: 'Reconnect your GitHub account.',
    403: 'The GitHub App needs access to this repository, and your account must have write permission.',
    404: 'This repository is not accessible to your GitHub App installation.',
    409: 'GitHub reports a branch conflict. Review the existing OAR proof branch.',
    422: 'GitHub rejected the change. Review existing branches and repository rules.',
    429: 'GitHub is rate limiting requests. Try again later.',
  };
  throw new GitHubApiError(`${action}: ${reasons[result.status] ?? `GitHub returned HTTP ${result.status}.`}`, result.status === 401 ? 401 : 422);
}
function field(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new GitHubApiError(`GitHub did not return a valid ${label}.`, 502);
  return value;
}
async function absent(token: string, path: string, label: string) {
  const found = await githubRequest(token, path);
  if (found.status === 404) return;
  if (found.status < 300) throw new GitHubApiError(`${label} already exists. OAR will not overwrite it automatically; use the manual publishing path or review the file yourself.`, 409);
  mustSucceed(found, `Checking ${label}`);
}

export async function createProofPR(token: string, claim: PreparedClaim, repository: string) {
  const target = prepareGitHubProof(claim, repository);
  const segment = `/repos/${target.owner}/${target.repo}`;
  const repo = mustSucceed(await githubRequest(token, segment), 'Opening repository');
  if (repo.private !== false || repo.archived === true || repo.disabled === true)
    throw new GitHubApiError('Guided proof publication works only with active public repositories.', 400);
  const base = field(repo.default_branch, 'default branch');
  if (!/^[A-Za-z0-9._/-]{1,128}$/.test(base) || base.includes('..')) throw new GitHubApiError('Unsupported default branch name.');
  await Promise.all([
    absent(token, `${segment}/contents/oar.json?ref=${encodeURIComponent(base)}`, 'Repository-root oar.json'),
    absent(token, `${segment}/contents/oar-manifest.json?ref=${encodeURIComponent(base)}`, 'oar-manifest.json'),
    absent(token, `${segment}/git/ref/heads/${target.branch}`, 'OAR claim branch'),
  ]);
  const current = mustSucceed(await githubRequest(token, `${segment}/branches/${encodeURIComponent(base)}`), 'Reading default branch');
  const baseSha = field((current.commit as Record<string, unknown> | undefined)?.sha, 'base commit');
  const commit = mustSucceed(await githubRequest(token, `${segment}/git/commits/${baseSha}`), 'Reading Git tree');
  const treeSha = field((commit.tree as Record<string, unknown> | undefined)?.sha, 'base tree');

  const blobs = await Promise.all(target.files.map(f => githubRequest(token, `${segment}/git/blobs`, 'POST', { content: f.content, encoding: 'utf-8' })));
  const elements = target.files.map((f, i) => ({
    path: f.path, mode: '100644', type: 'blob', sha: field(mustSucceed(blobs[i], 'Writing ' + f.path).sha, 'blob SHA'),
  }));
  const tree = mustSucceed(await githubRequest(token, `${segment}/git/trees`, 'POST', { base_tree: treeSha, tree: elements }), 'Preparing proof files');
  const newCommit = mustSucceed(await githubRequest(token, `${segment}/git/commits`, 'POST', {
    message: `Add OAR identity proof for ${claim.appId}`, tree: field(tree.sha, 'new tree SHA'), parents: [baseSha],
  }), 'Preparing review commit');
  const newSha = field(newCommit.sha, 'new commit SHA');
  mustSucceed(await githubRequest(token, `${segment}/git/refs`, 'POST', { ref: `refs/heads/${target.branch}`, sha: newSha }), 'Creating review branch');
  const pull = mustSucceed(await githubRequest(token, `${segment}/pulls`, 'POST', {
    title: `Add OAR control proof for ${String(claim.manifest.name).slice(0, 64)}`,
    head: target.branch, base,
    body: `## OAR identity proof (Devnet)\n\nApp ID: \`${claim.appId}\`\n\nThis adds repository-root \`oar.json\` and the corresponding \`oar-manifest.json\` without changing runtime code. Review and merge to publish the proof. The record's owner still signs onchain registration separately.\n\nRepository control is **not** a security audit. Verification is free and neutral. After merging, use a pinned commit SHA in the manifest raw URL.\n`,
  }), 'Opening proof pull request');
  const url = field(pull.html_url, 'pull-request URL');
  if (!url.startsWith(`https://github.com/${target.owner}/${target.repo}/pull/`))
    throw new GitHubApiError('GitHub returned an unexpected pull-request URL.', 502);
  return { url, branch: target.branch, manifestPath: 'oar-manifest.json', proofPath: 'oar.json' };
}
export { GitHubApiError };

import { domainToASCII } from 'node:url';
import { isAddress } from '@solana/kit';

export type Query =
  | { kind: 'address'; value: string }
  | { kind: 'domain'; value: string }
  | { kind: 'repository'; value: string }
  | { kind: 'invalid'; reason: string };

const HOSTNAME = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;
const GITHUB = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100}?)(?:\.git)?\/?$/;
const MAX_QUERY = 256;

/** Classify one search box entry: an address (App ID or program ID), a domain, or a GitHub repository. */
export function classifyQuery(raw: string): Query {
  const q = raw.trim();
  if (!q) return { kind: 'invalid', reason: 'Enter an App ID, program ID, domain or repository.' };
  if (q.length > MAX_QUERY) return { kind: 'invalid', reason: 'That is too long to be an address, domain or repository.' };
  if (isAddress(q)) return { kind: 'address', value: q };

  const repo = GITHUB.exec(q);
  if (repo) return { kind: 'repository', value: `https://github.com/${repo[1]}/${repo[2]}`.toLowerCase() };

  const host = q.replace(/^https?:\/\//i, '').split(/[/?#]/)[0].replace(/\.$/, '');
  if (/^(www\.)?github\.com$/i.test(host)) return { kind: 'invalid', reason: 'Use the repository root, for example https://github.com/owner/repo.' };
  if (!host.includes('@') && !host.includes(':')) {
    const ascii = domainToASCII(host.toLowerCase());
    if (ascii && HOSTNAME.test(ascii)) return { kind: 'domain', value: ascii };
  }
  return { kind: 'invalid', reason: 'Not a Solana address, a domain or a GitHub repository URL.' };
}

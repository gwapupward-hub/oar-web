import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proofAction, explainProof } from '../src/components/register/guidance';
import type { CheckRow } from '../src/lib/register-types';
const row = (kind: CheckRow['kind'], subject: string): CheckRow => ({ kind, subject, state: 'pending', detail: 'Not yet published' });

test('error recovery exposes only safe, inspectable proof URLs', () => {
  assert.equal(proofAction(row('domain', 'lilgwapz.xyz'))?.href, 'https://lilgwapz.xyz/.well-known/oar.json');
  assert.equal(proofAction(row('repository', 'https://github.com/gwapupward-hub/lil-gwapz'))?.label, 'Open repository');
  assert.equal(proofAction(row('manifest', 'https://lilgwapz.xyz/oar-manifest.json'))?.label, 'Open published manifest');
  assert.equal(proofAction(row('manifest', 'javascript:alert(1)')), null);
  assert.equal(proofAction(row('repository', 'https://github.com/a/b?attack=1')), null);
  assert.equal(proofAction(row('domain', 'evil.com@trusted.com')), null);
  assert.match(explainProof(row('repository', 'https://github.com/gwapupward-hub/lil-gwapz')) ?? '', /default branch/);
});

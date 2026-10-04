import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyQuery } from '../src/lib/query';

test('addresses are App or program IDs', () => {
  assert.deepEqual(classifyQuery('  Bu1JCyxiVDdDGjtNLLkKhq6KZv6E4LcUgqNkS5t5Nf2K '), { kind: 'address', value: 'Bu1JCyxiVDdDGjtNLLkKhq6KZv6E4LcUgqNkS5t5Nf2K' });
  assert.equal(classifyQuery('oariw8YXcYJh9sa9VcmBU3ZCdo2WVGMYPsLjEuUxfrC').kind, 'address');
  assert.equal(classifyQuery('0OIl0OIl0OIl0OIl0OIl0OIl0OIl0OIl').kind, 'invalid', 'not base58');
});

test('GitHub repositories normalize to the canonical root URL', () => {
  for (const q of ['https://github.com/gwapupward-hub/oar', 'github.com/gwapupward-hub/oar/', 'https://www.github.com/GwapUpward-Hub/OAR.git']) {
    assert.deepEqual(classifyQuery(q), { kind: 'repository', value: 'https://github.com/gwapupward-hub/oar' }, q);
  }
  assert.equal(classifyQuery('https://github.com/gwapupward-hub/oar/tree/main').kind, 'invalid', 'only repository roots');
});

test('domains are lowercased, stripped to the host and shown in punycode', () => {
  assert.deepEqual(classifyQuery('https://Example.COM/path?x=1'), { kind: 'domain', value: 'example.com' });
  assert.deepEqual(classifyQuery('gwapspot.fun.'), { kind: 'domain', value: 'gwapspot.fun' });
  assert.deepEqual(classifyQuery('xn--phntom-cua.app'), { kind: 'domain', value: 'xn--phntom-cua.app' });
  assert.deepEqual(classifyQuery('phäntom.app'), { kind: 'domain', value: 'xn--phntom-cua.app' });
});

test('everything else is refused without a network call', () => {
  for (const q of ['', '   ', 'localhost', 'user@example.com', 'example.com:8443', '-bad.example', 'a'.repeat(300), 'javascript:alert(1)']) {
    assert.equal(classifyQuery(q).kind, 'invalid', JSON.stringify(q));
  }
});

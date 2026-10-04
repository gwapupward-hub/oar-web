import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ttlCache } from '../src/lib/cache';

test('concurrent loads share one call; entries expire; failures are not cached', async () => {
  let t = 0;
  let calls = 0;
  const get = ttlCache<number>(1000, 2, () => t);
  const load = async () => ++calls;
  assert.deepEqual(await Promise.all([get('a', load), get('a', load)]), [1, 1]);
  t = 999;
  assert.equal(await get('a', load), 1);
  t = 1000;
  assert.equal(await get('a', load), 2, 'expired');
  await assert.rejects(get('b', () => Promise.reject(new Error('rpc down'))));
  assert.equal(await get('b', load), 3, 'a failure is retried');
  await get('c', load);
  await get('d', load);
  assert.equal(await get('a', load), 6, 'bounded: the oldest entry was evicted');
});

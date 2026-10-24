import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeObservation, type MonitorObservation } from '../src/lib/monitoring-policy';
const base: MonitorObservation = { checkedAt: '2026-10-24T00:00:00Z', manifestHttpOk: true, manifestHashMatches: true, domainProofReachable: null, repositoryProofReachable: null };
test('monitoring records operational status, never paid verification or security judgments', () => {
  assert.equal(summarizeObservation(base).state, 'available');
  assert.match(summarizeObservation(base).message, /not a security audit/);
  assert.equal(summarizeObservation({ ...base, manifestHttpOk: false }).state, 'unreachable');
  assert.equal(summarizeObservation({ ...base, manifestHashMatches: false }).state, 'changed');
  assert.equal(summarizeObservation({ ...base, domainProofReachable: false }).state, 'changed');
  assert.equal(summarizeObservation({ ...base, checkedAt: '' }).state, 'unknown');
});

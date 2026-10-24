/**
 * Operational availability only. NEVER export this as an identity, security, or trust score.
 * Monetized alerting/SLA services cannot modify the public OAR verifier's conclusions.
 */
export interface MonitorObservation {
  checkedAt: string;
  manifestHttpOk: boolean;
  manifestHashMatches: boolean | null;
  domainProofReachable: boolean | null;
  repositoryProofReachable: boolean | null;
}
export type MonitoringState = 'available' | 'changed' | 'unreachable' | 'unknown';
export function summarizeObservation(o: MonitorObservation): { state: MonitoringState; message: string } {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(o.checkedAt)) return { state: 'unknown', message: 'No valid observation time.' };
  if (!o.manifestHttpOk) return { state: 'unreachable', message: 'The manifest endpoint could not be reached from this monitor.' };
  if (o.manifestHashMatches === false) return { state: 'changed', message: 'The served manifest differs from the registered content hash.' };
  if (o.manifestHashMatches === null) return { state: 'unknown', message: 'The manifest was reachable, but the hash could not be checked.' };
  if (o.domainProofReachable === false || o.repositoryProofReachable === false)
    return { state: 'changed', message: 'A previously configured control proof is currently unavailable to this monitor.' };
  return { state: 'available', message: 'The observed endpoints matched during this check. This is not a security audit.' };
}

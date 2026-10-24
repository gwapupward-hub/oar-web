import type { Metadata } from 'next';
import Link from 'next/link';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata('OAR Monitoring — Service Concept | Open App Registry', 'Optional operations monitoring for registry publishers, separate from OAR’s free, neutral identity verification.', '/monitoring');

export default function MonitoringPage() {
  return (
    <div className="register-page">
      <p className="eyebrow">Planned service · no checkout</p>
      <h1>Operational monitoring, separate from verification</h1>
      <p className="lede">An App ID should remain equally verified whether or not its owner ever pays OAR. We are exploring optional monitoring tools for teams that want uptime and change alerts.</p>
      <section className="card">
        <h2>What a future monitoring service could provide</h2>
        <ul>
          <li>Scheduled checks for manifest availability, content changes and published control proofs.</li>
          <li>Alerts and incident history for the app owner; delivery and retention policies will be published before launch.</li>
          <li>Developer diagnostics, private notification channels and optional service guarantees.</li>
        </ul>
        <p><strong>It will never:</strong> turn a paid account into a more trusted identity, present ownership as a security audit, or suppress a failing public proof.</p>
      </section>
      <section className="card">
        <h2>What is available today</h2>
        <p>Free registry lookup and independent identity verification. Paid monitoring, billing, background checks and guarantees have not launched. There is no subscription or checkout on this page.</p>
        <Link className="button button-secondary" href="/register">Register an app for free</Link>
      </section>
    </div>
  );
}

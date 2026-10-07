import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';
const logo = `data:image/svg+xml;base64,${readFileSync(join(process.cwd(), 'public/oar-mark.svg')).toString('base64')}`;

export function GET() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px', background: '#07111F', color: '#F5F8FC', fontFamily: 'sans-serif', borderBottom: '12px solid #42E8B4' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* This is the pinned official brand mark, not a redrawn icon. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={72} height={72} alt="" />
          <span style={{ fontSize: 28, letterSpacing: 3 }}>OPEN APP REGISTRY</span>
        </div>
        <span style={{ fontSize: 24, color: '#22D3EE' }}>SOLANA DEVNET</span>
      </div>
      <div style={{ display: 'flex', fontSize: 64, lineHeight: 1.12, maxWidth: 940, fontWeight: 700 }}>Verifiable application identity for Solana.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <span style={{ fontSize: 30, color: '#42E8B4' }}>Apps · Programs · Domains · Source</span>
        <span style={{ fontSize: 22, color: '#8B99AA' }}>oarprotocol.xyz · Evidence of control. No safety endorsement.</span>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}

import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // The SDK runs as a plain Node module: its fetch transport pins DNS answers with node:dns and node:https.
  serverExternalPackages: ['@open-app-registry/sdk'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
        ],
      },
    ];
  },
};

export default config;

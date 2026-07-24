/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://challenges.cloudflare.com",
              "worker-src 'self' blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://challenges.cloudflare.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https: https://img.clerk.com",
              "connect-src 'self' https://api.paystack.co https://api.aladhan.com https://*.clerk.accounts.dev https://challenges.cloudflare.com",
              "frame-src 'self' https://*.clerk.accounts.dev https://challenges.cloudflare.com",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

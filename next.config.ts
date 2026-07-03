import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // L1: Content-Security-Policy — report-only first to avoid breaking inline styles/scripts.
  // Promote to enforcing (Content-Security-Policy) once no violations appear in reports.
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      // Next.js App Router requires 'unsafe-inline' for style tags and inline scripts.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https://images.unsplash.com https://pics.avs.io https://*.liteapi.travel https://*.booking.com",
      "connect-src 'self' https://api.groq.com https://generativelanguage.googleapis.com https://seats.aero https://api.telegram.org https://serpapi.com https://cdn.jsdelivr.net https://cdn.fawazahmed0.workers.dev",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pics.avs.io" },
      { protocol: "https", hostname: "*.liteapi.travel" },
      { protocol: "https", hostname: "*.booking.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

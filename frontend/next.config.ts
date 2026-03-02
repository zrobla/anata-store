import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const connectSrc = isDev
  ? [
      "'self'",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "ws://localhost:3000",
      "ws://127.0.0.1:3000",
      "http://localhost:8000",
      "http://127.0.0.1:8000",
      "https:"
    ].join(" ")
  : ["'self'", "https:"].join(" ");

const imgSrc = isDev
  ? ["'self'", "data:", "https:", "http://localhost:8000", "http://127.0.0.1:8000"].join(" ")
  : ["'self'", "data:", "https:"].join(" ");

const scriptSrc = isDev
  ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"].join(" ")
  : ["'self'", "'unsafe-inline'"].join(" ");

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "api.samsungmobilepress.com" },
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "http", hostname: "localhost", port: "8000" },
      { protocol: "http", hostname: "127.0.0.1", port: "8000" }
    ]
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      `connect-src ${connectSrc}`,
      `img-src ${imgSrc}`,
      "style-src 'self' 'unsafe-inline'",
      `script-src ${scriptSrc}`,
      "object-src 'none'",
      "frame-ancestors 'none'",
      ...(isDev ? [] : ["upgrade-insecure-requests"])
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: csp }
        ]
      }
    ];
  }
};

export default nextConfig;

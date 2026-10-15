import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const internalApiOrigin = process.env.INTERNAL_API_ORIGIN || "http://127.0.0.1:8000";

// En dev, on autorise l'API et le serveur local sur leurs ports reels: les ports
// par defaut peuvent etre pris par un autre projet de la machine.
const devPort = process.env.PORT || "3000";
const devHosts = (port: string) => [`http://localhost:${port}`, `http://127.0.0.1:${port}`];
const apiPort = new URL(internalApiOrigin).port || "8000";

const connectSrc = isDev
  ? [
      "'self'",
      ...devHosts(devPort),
      `ws://localhost:${devPort}`,
      `ws://127.0.0.1:${devPort}`,
      ...devHosts(apiPort),
      "https:"
    ].join(" ")
  : ["'self'", "https:"].join(" ");

const imgSrc = isDev
  ? ["'self'", "data:", "https:", ...devHosts(apiPort)].join(" ")
  : ["'self'", "data:", "https:"].join(" ");

const scriptSrc = isDev
  ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"].join(" ")
  : ["'self'", "'unsafe-inline'"].join(" ");

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "api.samsungmobilepress.com" },
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "fdn2.gsmarena.com" },
      { protocol: "https", hostname: "fdn.gsmarena.com" },
      { protocol: "http", hostname: "localhost", port: "8000" },
      { protocol: "http", hostname: "127.0.0.1", port: "8000" }
    ]
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${internalApiOrigin}/api/v1/:path*`
      },
      {
        source: "/media/:path*",
        destination: `${internalApiOrigin}/media/:path*`
      }
    ];
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

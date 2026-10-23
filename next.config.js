/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Chromium y puppeteer-core deben resolverse en runtime en el serverless
  // de Vercel. Si Next los mete en el bundle, el binario no se encuentra y
  // la generación del PDF del contrato falla.
  // Usamos @sparticuz/chromium-min, que descarga el pack (binario + shared
  // libs) desde GitHub Releases en runtime, así que ya NO necesitamos
  // bundelar bin/*.br via outputFileTracingIncludes.
  experimental: {
    serverComponentsExternalPackages: ["@sparticuz/chromium-min", "puppeteer-core"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "zdbfgpzympplsufmzwtt.supabase.co",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
 

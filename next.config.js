/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "zdbfgpzympplsufmzwtt.supabase.co",
      },
    ],
  },
};

module.exports = nextConfig;
 

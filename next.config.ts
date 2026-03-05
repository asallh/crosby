import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.nhle.com" },
      { protocol: "https", hostname: "nhl.bamcontent.com" },
      { protocol: "https", hostname: "www-league.nhlstatic.com" },
      { protocol: "https", hostname: "cms.nhl.bamgrid.com" }
    ]
  }
};

export default nextConfig;

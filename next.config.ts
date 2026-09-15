import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  images: {
    /**
     * Sanity serves every asset from one host, so a single pattern covers
     * the whole dataset. Scoped to the /images/ path rather than the bare
     * host: `remotePatterns` is an allow-list for the optimiser, and a
     * narrower entry means a URL from somewhere else on the domain cannot be
     * proxied through it.
     *
     * Local files under /public need no entry here — only remote hosts do.
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        pathname: "/images/**",
      },
    ],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // The dev overlay sits over the mobile file-list arrows and swallows the
  // clicks in e2e; errors still surface in the terminal and the log.
  devIndicators: false,
  // The feed moved from /discussions to /forum: keep old links working.
  redirects: async () => [
    { source: "/discussions/:path*", destination: "/forum/:path*", permanent: true },
  ],
};

export default nextConfig;

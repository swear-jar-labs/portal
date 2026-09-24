import type { NextConfig } from "next";

const isE2E = process.env.SWEARJAR_E2E === "1";

const nextConfig: NextConfig = {
  // Each e2e run owns a fresh server; keep its compiler cache and lock away
  // from the interactive dev server and production builds.
  distDir: isE2E ? ".next-e2e" : ".next",
  // The test server must not generate instruction files in the worktree.
  agentRules: !isE2E,
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

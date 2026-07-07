import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only observability (see DEBUGGING.md). Server Component fetches never
  // hit the browser Network tab — they run in Node — so the terminal is where
  // they're logged. browserToTerminal forwards browser console output here
  // too, giving one console for both runtimes.
  logging: {
    fetches: { fullUrl: true },
    browserToTerminal: true,
  },
  images: {
    // Allowlist for the image optimizer. It's a fetch-and-resize proxy on
    // our server, so unlisted hosts are refused — keep patterns as narrow
    // as possible (docs: "be as specific as possible").
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/seed/**",
      },
    ],
  },
};

export default nextConfig;

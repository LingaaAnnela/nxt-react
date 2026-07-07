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
};

export default nextConfig;

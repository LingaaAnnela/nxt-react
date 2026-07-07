import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // The server-only package is a poison pill that throws outside a
      // react-server context. Vitest doesn't implement the server/client
      // module split (Next's bundler swaps 'use server' imports for RPC
      // stubs; Vitest imports the real files), so any test whose import
      // graph reaches session.ts would explode. Alias it to an empty stub —
      // the boundary it enforces is a bundler concern, not a test concern.
      "server-only": path.resolve(__dirname, "./vitest.server-only-stub.ts"),
    },
  },
});

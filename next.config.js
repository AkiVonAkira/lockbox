/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // Standalone output keeps the container to the server and its traced files.
  output: "standalone",
  // Middleware buffers the body, 10 MB by default. An upload is up to 20 MB of pages.
  experimental: { middlewareClientMaxBodySize: "21mb" },
  // Lockbox pages are never cached by a proxy, and never framed by another site.
  headers: async () => [
    {
      source: "/((?!_next/static).*)",
      headers: [
        { key: "Cache-Control", value: "no-store" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Content-Type-Options", value: "nosniff" },
      ],
    },
  ],
};

export default config;

import type { NextConfig } from "next";

const config: NextConfig = {
  // PGlite ships a WASM Postgres build; keep it out of the server bundle.
  serverExternalPackages: ["@electric-sql/pglite"],
  images: { unoptimized: true },
  // Share images read their font from disk; make sure it ships with the server functions.
  outputFileTracingIncludes: { "/**": ["./src/assets/**"] },
};

export default config;

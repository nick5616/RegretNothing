import type { NextConfig } from "next";

const config: NextConfig = {
  // PGlite ships a WASM Postgres build; keep it out of the server bundle.
  serverExternalPackages: ["@electric-sql/pglite"],
  images: { unoptimized: true },
};

export default config;

import type { NextConfig } from "next";

// Versione statica: pagine HTML pubblicate su GitHub Pages; i dati passano dall'archivio online.
// NEXT_PUBLIC_BASE_PATH = cartella di pubblicazione (es. /app/los), NEXT_PUBLIC_EXEC_URL = archivio online
// (vuoto = modalità demo con dati fittizi salvati nel browser).
const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

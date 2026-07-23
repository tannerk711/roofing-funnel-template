// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

// Static site with three on-demand server routes (/api/geocode, /api/footprint, /api/lead).
// Those routes each set `export const prerender = false`.
export default defineConfig({
  // Placeholder domain: swap for the real client's domain at rebrand
  // (used for canonical/og absolute URLs).
  site: "https://apexroofingco.example.com",
  output: "static",
  adapter: vercel(),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
  server: { port: 4321 },
});

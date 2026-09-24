import path from "node:path";

import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";
import { PRODUCT_NAME } from "./src/workbench/model/product.ts";

const clientRoot = path.resolve(import.meta.dirname);

export const CLIENT_DIST = ".output/dist/client";

export default defineConfig({
  root: path.join(clientRoot, "src/app"),
  cacheDir: path.join(clientRoot, "node_modules/.vite"),
  plugins: [
    react(),
    {
      name: "arka-product-name",
      transformIndexHtml: (html: string) => html.replaceAll("%PRODUCT_NAME%", PRODUCT_NAME),
    },
    VitePWA({
      registerType: "autoUpdate",
      filename: "app-sw.js",
      includeAssets: ["arka-mark.svg"],
      manifest: {
        name: PRODUCT_NAME,
        short_name: PRODUCT_NAME,
        description: "Agent Development Environment",
        lang: "ko",
        display: "standalone",
        start_url: "/",
        scope: "/",
        theme_color: "#1f2328",
        background_color: "#ffffff",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//u],
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    outDir: path.join(clientRoot, "../..", CLIENT_DIST),
    emptyOutDir: true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "codemirror", test: /node_modules[\\/]@(?:codemirror|lezer)[\\/]/u },
            { name: "primer", test: /node_modules[\\/]@primer[\\/]/u },
            { name: "radix", test: /node_modules[\\/]@radix-ui[\\/]/u },
            { name: "react", test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/u },
          ],
        },
      },
    },
  },
  server: {
    proxy: { "/api": { target: "http://localhost:3000", changeOrigin: true } },
  },
  test: {
    root: clientRoot,
    exclude: ["**/node_modules/**", "test/e2e/**", "test/visual-regression/**"],
    environment: "jsdom",
    setupFiles: ["./test/vitestSetup.ts"],
    globals: true,
    server: { deps: { inline: [/@primer\/react/, /@primer\/primitives/] } },
  },
});

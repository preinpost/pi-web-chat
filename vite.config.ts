import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: {
    outDir: "dist/public",
    emptyOutDir: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon-64.png", "apple-touch-icon.png"],
      manifest: {
        name: "pi web",
        short_name: "pi web",
        description: "pi coding agent web client",
        theme_color: "#0a0a0a",
        background_color: "#0a0a0a",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // API/WS는 캐시하지 않음 (빌드 에셋만 precache)
        navigateFallbackDenylist: [/^\/api\//, /^\/ws/],
      },
    }),
  ],
  server: {
    port: 5173,
    host: true, // 모바일 기기에서 같은 네트워크로 접속 가능
    proxy: {
      "/api": "http://localhost:3141",
      "/ws": { target: "ws://localhost:3141", ws: true },
    },
  },
});

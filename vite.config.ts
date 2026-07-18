import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true, // 모바일 기기에서 같은 네트워크로 접속 가능
    proxy: {
      "/api": "http://localhost:3141",
      "/ws": { target: "ws://localhost:3141", ws: true },
    },
  },
});

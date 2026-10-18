import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// バックエンドと同じ環境変数を参照してポートを揃える
const backendPort = process.env.REPAT_SERVER_PORT ?? "8080";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": `http://localhost:${backendPort}`,
    },
  },
});

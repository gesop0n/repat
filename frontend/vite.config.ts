import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// バックエンドと同じ環境変数を参照してポートを揃える
const backendPort = process.env.REPAT_SERVER_PORT ?? "8080";

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        // ライブラリをアプリのコードと別のファイルにする。アプリだけ変えたときは、ブラウザがキャッシュ済みのライブラリをそのまま使える
        codeSplitting: {
          groups: [
            // React はほとんど更新しないので、ほかのライブラリともさらに分ける
            {
              name: "react",
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 20,
            },
            { name: "vendor", test: /node_modules[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": `http://localhost:${backendPort}`,
    },
  },
});

import { defineConfig } from "orval";

// ../api/openapi.yaml から TanStack Query のフックと zod のスキーマを生成する (`make openapi`)
export default defineConfig({
  repat: {
    input: { target: "../api/openapi.yaml" },
    output: {
      target: "src/api/generated/repat.ts",
      schemas: { path: "src/api/generated/model", type: "zod" },
      client: "react-query",
      httpClient: "fetch",
      // 仕様書の servers (/api) を URL の先頭に付ける
      baseUrl: { getBaseUrlFromSpecification: true },
      // 仕様書から消えた操作のファイルが残らないようにする
      clean: true,
      override: {
        mutator: { path: "src/api/fetcher.ts", name: "apiFetch" },
        // mutator が fetch するため、レスポンスのスキーマを mutator に渡して検証させる
        includeZodSchemaInArguments: true,
        fetch: {
          runtimeValidation: true,
          // mutator は { data, status } ではなくレスポンスの本体を返す
          includeHttpResponseReturnType: false,
        },
        zod: {
          // Go の time.Time は +09:00 のようなオフセット付きで返る
          dateTimeOptions: { offset: true },
        },
      },
    },
  },
});

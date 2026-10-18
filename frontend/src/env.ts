import { z } from "zod";

// import.meta.env はビルド時に埋め込まれるため、値はビルドした時点で決まる
const envSchema = z.object({
  VITE_REPAT_ENV: z.enum(["development", "production"]).default("development"),
});

export const env = envSchema.parse(import.meta.env);

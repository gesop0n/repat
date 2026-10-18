import { z } from "zod";

// import.meta.env はビルド時に埋め込まれるため、値はビルドした時点で決まる
const envSchema = z.object({
  VITE_REPAT_ENV: z.enum(["development", "production"]).default("development"),
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export const env = envSchema.parse(import.meta.env);

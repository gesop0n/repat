import { createClient } from "@supabase/supabase-js";
import { env } from "../env";

export const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // OAuth から戻るときにトークンを URL に載せず、/auth/callback で受け取った code と交換する
    flowType: "pkce",
  },
});

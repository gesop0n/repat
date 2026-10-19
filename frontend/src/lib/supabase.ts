import { AuthClient } from "@supabase/auth-js";
import { env } from "../env";

// Supabase は Auth しか使わないので、supabase-js ではなく auth-js のクライアントだけを作る
// (supabase-js には使わない Realtime・Storage・Data API のクライアントも含まれる)
export const supabaseAuth = new AuthClient({
  url: `${env.VITE_SUPABASE_URL}/auth/v1`,
  headers: {
    apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
  },
  storageKey: "repat-auth",
  // 以下は supabase-js の createClient の既定値と同じ
  autoRefreshToken: true,
  persistSession: true,
  // /auth/callback に戻ってきたとき、URL の code をセッションに交換する
  detectSessionInUrl: true,
  // OAuth から戻るときにトークンを URL に載せず、/auth/callback で受け取った code と交換する
  flowType: "pkce",
});

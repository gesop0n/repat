import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { supabaseAuth } from "../lib/supabase";
import { AuthContext, type AuthState } from "./context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ session: null, loading: true });

  useEffect(() => {
    // 登録すると、初期化が終わった時点のセッションが INITIAL_SESSION として最初に届く
    // その後はログイン・ログアウト・トークンの更新のたびに届く
    const { data } = supabaseAuth.onAuthStateChange((event, session) => {
      // 前のユーザーの API のレスポンスを、次にログインしたユーザーに見せない
      if (event === "SIGNED_OUT") {
        queryClient.clear();
      }
      setState({ session, loading: false });
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  return <AuthContext value={state}>{children}</AuthContext>;
}

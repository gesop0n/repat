import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { AuthContext, type AuthState } from "./context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true });

  useEffect(() => {
    // 登録すると、初期化が終わった時点のセッションが INITIAL_SESSION として最初に届く
    // その後はログイン・ログアウト・トークンの更新のたびに届く
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, loading: false });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <AuthContext value={state}>{children}</AuthContext>;
}

import type { Session } from "@supabase/auth-js";
import { createContext, useContext } from "react";

export type AuthState = {
  session: Session | null;
  // 保存済みのセッションの読み込みや、OAuth の code の交換が終わるまで true
  loading: boolean;
};

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const state = useContext(AuthContext);
  if (!state) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return state;
}

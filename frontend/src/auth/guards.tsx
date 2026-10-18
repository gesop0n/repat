import { Navigate, Outlet } from "react-router";
import { useAuth } from "./context";

// ログインしていなければ /login へ移動する
export function RequireAuth() {
  const { session, loading } = useAuth();
  if (loading) {
    return null;
  }
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

// ログイン済みならトップへ移動する (ログイン・登録画面用)
export function GuestOnly() {
  const { session, loading } = useAuth();
  if (loading) {
    return null;
  }
  if (session) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

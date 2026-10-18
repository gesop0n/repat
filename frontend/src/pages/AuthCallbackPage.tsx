import { Link, Navigate, useSearchParams } from "react-router";
import { useAuth } from "../auth/context";

// OAuth から戻る先。code とセッションの交換は supabase-js が初期化時に行う
export function AuthCallbackPage() {
  const { session, loading } = useAuth();
  const [params] = useSearchParams();
  const errorDescription = params.get("error_description");

  if (errorDescription) {
    return (
      <main className="auth">
        <div className="card">
          <h1>ログインできませんでした</h1>
          <p className="message message-error" role="alert">
            {errorDescription}
          </p>
          <Link to="/login">ログイン画面に戻る</Link>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="auth">
        <p role="status">ログインしています…</p>
      </main>
    );
  }

  return <Navigate to={session ? "/" : "/login"} replace />;
}

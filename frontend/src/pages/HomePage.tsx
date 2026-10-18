import { useGetMe } from "../api/generated/repat";
import { supabase } from "../lib/supabase";

export function HomePage() {
  const { data: me, error } = useGetMe();

  return (
    <div className="app">
      <header className="header">
        <span className="brand">repat</span>
        {/* ログアウトするとセッションが消え、RequireAuth が /login へ移動させる */}
        <button
          type="button"
          className="button button-secondary"
          onClick={() => void supabase.auth.signOut()}
        >
          ログアウト
        </button>
      </header>

      <main className="home">
        {error && (
          <p className="message message-error" role="alert">
            ユーザー情報を取得できませんでした ({error.message})
          </p>
        )}
        {me && (
          <section className="card">
            <h1>ようこそ</h1>
            <dl>
              <dt>メールアドレス</dt>
              <dd>{me.email}</dd>
              <dt>ユーザー ID</dt>
              <dd>
                <code>{me.id}</code>
              </dd>
            </dl>
          </section>
        )}
      </main>
    </div>
  );
}

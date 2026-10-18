import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { authErrorMessage } from "../auth/errors";
import { supabase } from "../lib/supabase";

type Mode = "login" | "signup";

const texts = {
  login: {
    title: "ログイン",
    github: "GitHub でログイン",
    submit: "ログイン",
    pending: "ログインしています…",
    switchLead: "アカウントをお持ちでない方は",
    switchLabel: "新規登録",
    switchTo: "/signup",
    passwordAutoComplete: "current-password",
  },
  signup: {
    title: "新規登録",
    github: "GitHub で登録",
    submit: "登録する",
    pending: "登録しています…",
    switchLead: "アカウントをお持ちの方は",
    switchLabel: "ログイン",
    switchTo: "/login",
    passwordAutoComplete: "new-password",
  },
} as const;

export function AuthPage({ mode }: { mode: Mode }) {
  const text = texts[mode];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);

    // 成功するとセッションが更新され、GuestOnly がトップへ移動させる
    const { data, error } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setPending(false);

    if (error) {
      setError(authErrorMessage(error));
      return;
    }
    if (!data.session) {
      // Supabase 側でメールアドレスの確認を有効にしているとセッションが返らない
      setNotice("確認メールを送りました。メールのリンクを開いて登録を完了してください");
    }
  }

  async function handleGitHub() {
    setError(null);
    // GitHub に移動し、戻ってきたら /auth/callback でセッションを受け取る
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(authErrorMessage(error));
    }
  }

  return (
    <main className="auth">
      <div className="card">
        <p className="brand">repat</p>
        <h1>{text.title}</h1>

        <button
          type="button"
          className="button button-github"
          onClick={handleGitHub}
          disabled={pending}
        >
          {text.github}
        </button>

        <div className="divider">
          <span>または</span>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            メールアドレス
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            パスワード
            <input
              type="password"
              name="password"
              autoComplete={text.passwordAutoComplete}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && (
            <p className="message message-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="message" role="status">
              {notice}
            </p>
          )}

          <button type="submit" className="button button-primary" disabled={pending}>
            {pending ? text.pending : text.submit}
          </button>
        </form>

        <p className="switch">
          {text.switchLead} <Link to={text.switchTo}>{text.switchLabel}</Link>
        </p>
      </div>
    </main>
  );
}

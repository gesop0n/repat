import { revalidateLogic, useForm, useStore } from "@tanstack/react-form";
import { useState } from "react";
import { Link } from "react-router";
import { z } from "zod";
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

const email = z.email("メールアドレスの形式が正しくありません");

const schemas = {
  login: z.object({
    email,
    password: z.string().min(1, "パスワードを入力してください"),
  }),
  signup: z.object({
    email,
    // supabase/config.toml の minimum_password_length と揃える
    password: z.string().min(6, "パスワードは 6 文字以上にしてください"),
  }),
};

export function AuthPage({ mode }: { mode: Mode }) {
  const text = texts[mode];
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { email: "", password: "" },
    // 最初は送信したときに検証し、その後は入力のたびに検証し直す
    validationLogic: revalidateLogic(),
    validators: { onDynamic: schemas[mode] },
    onSubmit: async ({ value }) => {
      setError(null);
      setNotice(null);

      // 成功するとセッションが更新され、GuestOnly がトップへ移動させる
      const { data, error } =
        mode === "login"
          ? await supabase.auth.signInWithPassword(value)
          : await supabase.auth.signUp(value);

      if (error) {
        setError(authErrorMessage(error));
        return;
      }
      if (!data.session) {
        // Supabase 側でメールアドレスの確認を有効にしているとセッションが返らない
        setNotice("確認メールを送りました。メールのリンクを開いて登録を完了してください");
      }
    },
  });
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting);

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
          disabled={isSubmitting}
        >
          {text.github}
        </button>

        <div className="divider">
          <span>または</span>
        </div>

        {/* ブラウザの検証ではなく、schemas のメッセージを出す */}
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field name="email">
            {(field) => (
              <TextField
                label="メールアドレス"
                type="email"
                name={field.name}
                autoComplete="email"
                value={field.state.value}
                error={field.state.meta.errors[0]?.message}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <TextField
                label="パスワード"
                type="password"
                name={field.name}
                autoComplete={text.passwordAutoComplete}
                value={field.state.value}
                error={field.state.meta.errors[0]?.message}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          </form.Field>

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

          <button type="submit" className="button button-primary" disabled={isSubmitting}>
            {isSubmitting ? text.pending : text.submit}
          </button>
        </form>

        <p className="switch">
          {text.switchLead} <Link to={text.switchTo}>{text.switchLabel}</Link>
        </p>
      </div>
    </main>
  );
}

type TextFieldProps = {
  label: string;
  type: "email" | "password";
  name: string;
  autoComplete: string;
  value: string;
  error: string | undefined;
  onBlur: () => void;
  onChange: (value: string) => void;
};

function TextField({ label, name, error, onChange, ...input }: TextFieldProps) {
  const errorId = `${name}-error`;
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input
        {...input}
        id={name}
        name={name}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

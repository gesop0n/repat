import { revalidateLogic, useForm, useStore } from "@tanstack/react-form";
import { useState } from "react";
import { Link } from "react-router";
import { z } from "zod";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authErrorMessage } from "../auth/errors";
import { supabaseAuth } from "../lib/supabase";

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
          ? await supabaseAuth.signInWithPassword(value)
          : await supabaseAuth.signUp(value);

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
    const { error } = await supabaseAuth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(authErrorMessage(error));
    }
  }

  return (
    <AuthLayout>
      <Card className="gap-6 rounded-2xl py-8 shadow-card [--card-spacing:--spacing(8)] max-sm:[--card-spacing:--spacing(6)]">
        <CardHeader className="text-center">
          <CardTitle>
            <h1 className="text-2xl font-bold tracking-tight">{text.title}</h1>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={handleGitHub}
            disabled={isSubmitting}
          >
            {text.github}
          </Button>

          <div className="my-6 flex items-center gap-3 text-sm text-muted-foreground before:flex-1 before:border-t before:border-border after:flex-1 after:border-t after:border-border">
            または
          </div>

          {/* ブラウザの検証ではなく、schemas のメッセージを出す */}
          <form
            noValidate
            className="grid gap-5"
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
              <p
                className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive"
                role="alert"
              >
                {error}
              </p>
            )}
            {notice && (
              <p
                className="rounded-lg bg-accent px-4 py-3 text-sm text-accent-foreground"
                role="status"
              >
                {notice}
              </p>
            )}

            <Button
              type="submit"
              className="mt-2 h-11 w-full shadow-action hover:bg-primary-hover"
              disabled={isSubmitting}
            >
              {isSubmitting ? text.pending : text.submit}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-7 text-center text-sm text-muted-foreground">
        {text.switchLead}{" "}
        <Link
          to={text.switchTo}
          className="rounded-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          {text.switchLabel}
        </Link>
      </p>
    </AuthLayout>
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
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        {...input}
        id={name}
        name={name}
        required
        className="h-11 bg-card"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

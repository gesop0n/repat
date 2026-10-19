import { AuroraBackground } from "@/components/AuroraBackground";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetMe } from "../api/generated/repat";
import { supabase } from "../lib/supabase";

export function HomePage() {
  const { data: me, error } = useGetMe();

  return (
    <AuroraBackground intensity="subtle" className="min-h-svh">
      <header className="flex items-center justify-between border-b bg-card/80 px-4 py-3 backdrop-blur">
        <Brand className="text-2xl" />
        {/* ログアウトするとセッションが消え、RequireAuth が /login へ移動させる */}
        <Button type="button" variant="outline" onClick={() => void supabase.auth.signOut()}>
          ログアウト
        </Button>
      </header>

      <main className="mx-auto grid max-w-140 gap-4 px-4 py-8">
        {error && (
          <p
            className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            ユーザー情報を取得できませんでした ({error.message})
          </p>
        )}
        {me && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>
                <h1 className="text-xl font-bold">ようこそ</h1>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2">
                <dt className="text-muted-foreground">メールアドレス</dt>
                <dd className="wrap-anywhere">{me.email}</dd>
                <dt className="text-muted-foreground">ユーザー ID</dt>
                <dd className="wrap-anywhere">
                  <code className="font-mono text-[0.875em]">{me.id}</code>
                </dd>
              </dl>
            </CardContent>
          </Card>
        )}
      </main>
    </AuroraBackground>
  );
}

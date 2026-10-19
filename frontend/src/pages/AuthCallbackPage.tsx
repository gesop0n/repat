import { Link, Navigate, useSearchParams } from "react-router";
import { AuthLayout } from "@/components/AuthLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "../auth/context";

// OAuth から戻る先。code とセッションの交換は supabase-js が初期化時に行う
export function AuthCallbackPage() {
  const { session, loading } = useAuth();
  const [params] = useSearchParams();
  const errorDescription = params.get("error_description");

  if (errorDescription) {
    return (
      <AuthLayout>
        <Card className="gap-6 rounded-2xl py-8 shadow-card [--card-spacing:--spacing(8)] max-sm:[--card-spacing:--spacing(6)]">
          <CardHeader className="text-center">
            <CardTitle>
              <h1 className="text-2xl font-bold tracking-tight">ログインできませんでした</h1>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <p
              className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {errorDescription}
            </p>
            <Link
              to="/login"
              className="rounded-sm text-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              ログイン画面に戻る
            </Link>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  if (loading) {
    return (
      <AuthLayout>
        <p className="text-center text-sm text-muted-foreground" role="status">
          ログインしています…
        </p>
      </AuthLayout>
    );
  }

  return <Navigate to={session ? "/" : "/login"} replace />;
}

import type { ZodType } from "zod";
import { supabaseAuth } from "../lib/supabase";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// orval が生成したフックから呼ばれ、API を呼ぶ
// ログイン中ならアクセストークンを Authorization ヘッダに付け、レスポンスを schema で検証する
export async function apiFetch<T>(
  url: string,
  options: RequestInit & { schema?: ZodType<T> },
): Promise<T> {
  const { schema, ...init } = options;

  // 期限が切れていれば、ここで更新されたトークンが返る
  const { data } = await supabaseAuth.getSession();

  const headers = new Headers(init.headers);
  if (data.session) {
    headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }

  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    throw new ApiError(res.status, `${init.method ?? "GET"} ${url}: ${res.status}`);
  }

  const body: unknown = await res.json();
  return schema ? schema.parse(body) : (body as T);
}

// 生成されたフックの error の型
// 失敗したレスポンスは ApiError、検証できないレスポンスは ZodError、通信の失敗は TypeError になる
export type ErrorType<_Body> = Error;

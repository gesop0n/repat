import { z } from "zod";
import { supabase } from "./supabase";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// API を呼び、レスポンスを schema で検証して返す
// ログイン中ならアクセストークンを Authorization ヘッダに付ける
export async function apiFetch<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  // 期限が切れていれば、ここで更新されたトークンが返る
  const { data } = await supabase.auth.getSession();

  const headers = new Headers(init?.headers);
  if (data.session) {
    headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }

  const res = await fetch(`/api${path}`, { ...init, headers });
  if (!res.ok) {
    throw new ApiError(res.status, `${init?.method ?? "GET"} /api${path}: ${res.status}`);
  }

  return schema.parse(await res.json());
}

const meSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  created_at: z.string(),
});

export type Me = z.infer<typeof meSchema>;

// ログイン中のユーザーを返す。初回の呼び出しでアプリ側のユーザーが作られる
export function fetchMe(): Promise<Me> {
  return apiFetch("/me", meSchema);
}

import type { AuthError } from "@supabase/auth-js";

// https://supabase.com/docs/guides/auth/debugging/error-codes
export function authErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "メールアドレスかパスワードが違います";
    case "user_already_exists":
    case "email_exists":
      return "このメールアドレスはすでに登録されています";
    case "weak_password":
      return "パスワードが短すぎるか、単純すぎます";
    case "email_address_invalid":
      return "メールアドレスの形式が正しくありません";
    case "over_request_rate_limit":
      return "リクエストが多すぎます。しばらく待ってからやり直してください";
    default:
      return error.message;
  }
}

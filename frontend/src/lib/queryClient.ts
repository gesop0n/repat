import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "../api/fetcher";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 4xx はやり直しても結果が変わらないので、すぐに失敗させる
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status < 500) && failureCount < 3,
    },
  },
});

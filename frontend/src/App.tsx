import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { AuthProvider } from "./auth/AuthProvider";
import { GuestOnly, RequireAuth } from "./auth/guards";
import { queryClient } from "./lib/queryClient";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { AuthPage } from "./pages/AuthPage";
import { HomePage } from "./pages/HomePage";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<GuestOnly />}>
              {/* key が無いと同じ AuthPage が使い回され、入力やエラーが画面をまたいで残る */}
              <Route path="/login" element={<AuthPage key="login" mode="login" />} />
              <Route path="/signup" element={<AuthPage key="signup" mode="signup" />} />
            </Route>
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/" element={<HomePage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

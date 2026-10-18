import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { AuthProvider } from "./auth/AuthProvider";
import { GuestOnly, RequireAuth } from "./auth/guards";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { AuthPage } from "./pages/AuthPage";
import { HomePage } from "./pages/HomePage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<GuestOnly />}>
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/signup" element={<AuthPage mode="signup" />} />
          </Route>
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<HomePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

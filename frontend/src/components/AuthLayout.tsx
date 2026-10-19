import type { ReactNode } from "react";
import { AuroraBackground } from "@/components/AuroraBackground";
import { Brand } from "@/components/Brand";

// ログイン・登録など、ログイン前の画面の外枠
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuroraBackground>
      <main className="grid min-h-svh place-items-center px-6 py-16 max-sm:px-4 max-sm:py-10">
        <div className="w-full max-w-100">
          <p className="mb-10 text-center max-sm:mb-8">
            <Brand className="text-6xl max-sm:text-5xl" />
          </p>
          {children}
        </div>
      </main>
    </AuroraBackground>
  );
}

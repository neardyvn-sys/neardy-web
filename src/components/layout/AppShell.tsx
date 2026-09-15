"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/components/providers/AppProvider";
import AppHeader from "@/components/layout/AppHeader";
import BottomNav from "@/components/layout/BottomNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, ready } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [ready, user, router, pathname]);

  if (!ready || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0a0c14" }}>
        <div className="skeleton w-40 h-8 rounded-xl" />
      </div>
    );
  }

  const hideChrome =
    pathname.startsWith("/messages/") ||
    pathname.startsWith("/wall/") ||
    pathname.startsWith("/friends/") ||
    pathname.startsWith("/profile/security");
  const fullBleed =
    pathname.startsWith("/wall/") ||
    pathname.startsWith("/friends/") ||
    pathname.startsWith("/profile/security");

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0c14", color: "#e8eaf2" }}>
      {!hideChrome && <AppHeader />}
      <main
        className={`flex-1 overflow-y-auto w-full ${fullBleed ? "" : "max-w-md mx-auto"} ${hideChrome ? "" : "pb-24"}`}
      >
        {children}
      </main>
      {!hideChrome && <BottomNav />}
    </div>
  );
}

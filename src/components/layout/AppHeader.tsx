"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/brand/Logo";
import { TAB_TITLES } from "@/lib/constants";
import { useApp } from "@/components/providers/AppProvider";

export default function AppHeader() {
  const pathname = usePathname();
  const { user } = useApp();
  const tab = pathname.split("/")[1] || "nearby";
  const title = TAB_TITLES[tab] ?? "Neardy";

  // Hide main header on nested full-screen routes
  if (
    pathname.startsWith("/messages/") ||
    pathname.startsWith("/wall/") ||
    pathname.startsWith("/friends/") ||
    pathname.startsWith("/profile/security") ||
    pathname.startsWith("/profile/notifications") ||
    pathname.startsWith("/profile/location") ||
    pathname.startsWith("/profile/privacy")
  ) {
    return null;
  }

  const isProfileActive = pathname.startsWith("/profile");

  return (
    <header
      className="sticky top-0 z-20 px-4 pt-5 pb-3 flex-shrink-0"
      style={{ background: "linear-gradient(to bottom, #0a0c14 85%, transparent)" }}
    >
      <div className="max-w-md mx-auto flex items-center justify-between">
        <Logo size="md" />
        <Link
          href="/profile"
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all hover:opacity-80 active:scale-95"
          style={{
            backgroundColor: isProfileActive ? "rgba(108, 99, 255, 0.3)" : "rgba(108, 99, 255, 0.15)",
            color: "#6c63ff",
            border: `1px solid ${isProfileActive ? "#6c63ff" : "rgba(108, 99, 255, 0.3)"}`,
          }}
        >
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name || "Cá nhân"} className="w-4 h-4 rounded-full object-cover" />
          ) : (
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <circle cx="12" cy="8" r="4" fill="currentColor" />
              <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" />
            </svg>
          )}
          <span>Cá nhân</span>
        </Link>
      </div>
      <div className="max-w-md mx-auto mt-2">
        <h1 className="text-lg font-extrabold" style={{ color: "#e8eaf2" }}>
          {title}
        </h1>
      </div>
    </header>
  );
}


"use client";

import { usePathname } from "next/navigation";
import Logo from "@/components/brand/Logo";
import { TAB_TITLES } from "@/lib/constants";
import { useApp } from "@/components/providers/AppProvider";

export default function AppHeader() {
  const pathname = usePathname();
  const { permissionState } = useApp();
  const tab = pathname.split("/")[1] || "nearby";
  const title = TAB_TITLES[tab] ?? "Neardy";

  // Hide main header on nested full-screen routes
  if (
    pathname.startsWith("/messages/") ||
    pathname.startsWith("/wall/") ||
    pathname.startsWith("/friends/") ||
    pathname.startsWith("/profile/security")
  ) {
    return null;
  }

  return (
    <header
      className="sticky top-0 z-20 px-4 pt-5 pb-3 flex-shrink-0"
      style={{ background: "linear-gradient(to bottom, #0a0c14 85%, transparent)" }}
    >
      <div className="max-w-md mx-auto flex items-center justify-between">
        <Logo size="md" />
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
          style={{
            backgroundColor:
              permissionState === "granted" ? "rgba(0,229,255,0.1)" : "rgba(108,99,255,0.1)",
            color: permissionState === "granted" ? "#00e5ff" : "#6c63ff",
            border: `1px solid ${
              permissionState === "granted" ? "rgba(0,229,255,0.2)" : "rgba(108,99,255,0.2)"
            }`,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          {permissionState === "loading" ? "Định vị…" : permissionState === "denied" ? "Xấp xỉ" : "GPS"}
        </div>
      </div>
      <div className="max-w-md mx-auto mt-2">
        <h1 className="text-lg font-extrabold" style={{ color: "#e8eaf2" }}>
          {title}
        </h1>
      </div>
    </header>
  );
}

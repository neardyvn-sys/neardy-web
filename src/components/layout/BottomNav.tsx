"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Tab } from "@/lib/types";
import { useApp } from "@/components/providers/AppProvider";

const NAV_ITEMS: {
  id: Tab;
  href: string;
  label: string;
  icon: (active: boolean) => ReactNode;
}[] = [
    {
      id: "nearby",
      href: "/nearby",
      label: "Quanh đây",
      icon: (a) => (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={a ? 2.5 : 2}>
          <path
            d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
            fill={a ? "currentColor" : "none"}
          />
          <circle
            cx="12"
            cy="9"
            r="2.5"
            fill={a ? "white" : "none"}
            stroke={a ? "none" : "currentColor"}
            strokeWidth={2}
          />
        </svg>
      ),
    },
    {
      id: "messages",
      href: "/messages",
      label: "Tin nhắn",
      icon: (a) => (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={a ? 2.5 : 2}>
          <path
            d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            fill={a ? "currentColor" : "none"}
          />
        </svg>
      ),
    },
    {
      id: "feed",
      href: "/feed",
      label: "Tường nhà",
      icon: (a) => (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="3" width="18" height="18" rx="2" fill={a ? "currentColor" : "none"} />
          <path d="M3 9h18" stroke={a ? "white" : "currentColor"} />
          <path d="M9 21V9" stroke={a ? "white" : "currentColor"} />
        </svg>
      ),
    },
    {
      id: "dating",
      href: "/dating",
      label: "Hẹn hò",
      icon: (a) => (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={a ? 2.5 : 2}>
          <path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill={a ? "#ff4b72" : "none"}
            stroke={a ? "#ff4b72" : "currentColor"}
          />
        </svg>
      ),
    },
    {
      id: "contacts",
      href: "/contacts",
      label: "Danh bạ",
      icon: (a) => (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={a ? 2.5 : 2}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" fill={a ? "currentColor" : "none"} />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
  ];

export default function BottomNav() {
  const pathname = usePathname();
  const { matches } = useApp();
  const unreadTotal = matches.reduce((s, m) => s + (m.unread || 0), 0);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 flex items-stretch"
      style={{ backgroundColor: "#0d0f1a", borderTop: "1px solid #1e2240" }}
    >
      <div className="max-w-md mx-auto w-full flex">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.id}
              href={item.href}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-all relative"
              style={{ color: active ? "#6c63ff" : "#3a4060" }}
            >
              {item.icon(active)}
              <span className="font-semibold" style={{ fontSize: "10px" }}>
                {item.label}
              </span>
              {item.id === "messages" && unreadTotal > 0 && (
                <span
                  className="absolute top-2 right-1/4 min-w-4 h-4 px-1 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: "#6c63ff", fontSize: "9px", fontWeight: 700 }}
                >
                  {unreadTotal > 9 ? "9+" : unreadTotal}
                </span>
              )}
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ backgroundColor: "#6c63ff" }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

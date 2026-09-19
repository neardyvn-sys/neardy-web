"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import { useApp } from "@/components/providers/AppProvider";
import { initialsFromName } from "@/lib/types";

function formatListTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins}p`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    ...(sameYear ? {} : { year: "2-digit" }),
  });
}

export default function MessagesList() {
  const { matches, refreshMatches } = useApp();
  const router = useRouter();
  const totalUnread = matches.reduce((s, m) => s + (m.unread || 0), 0);

  useEffect(() => {
    void refreshMatches();
  }, [refreshMatches]);

  return (
    <div className="px-4 pb-4">
      {/* AI Companion Quick Entry */}
      <Link
        href="/ai-companions"
        className="mb-3 px-4 py-3 rounded-2xl flex items-center justify-between transition-all hover:opacity-90 active:scale-[0.99] block"
        style={{
          background: "linear-gradient(135deg, rgba(108,99,255,0.2), rgba(139,92,246,0.15))",
          border: "1px solid rgba(108,99,255,0.3)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg bg-purple-900/60 text-white shrink-0">
            🤖
          </div>
          <div>
            <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>AI Companion</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-300 font-bold">New</span>
            </div>
            <div className="text-[11px] text-purple-200/70">Trò chuyện & Tâm sự cùng trợ lý ảo</div>
          </div>
        </div>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="text-purple-400">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </Link>

      {totalUnread > 0 && (
        <div
          className="mb-4 px-4 py-3 rounded-2xl flex items-center gap-2"
          style={{ backgroundColor: "rgba(108,99,255,0.1)", border: "1px solid rgba(108,99,255,0.2)" }}
        >
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "#6c63ff" }} />
          <span className="text-xs font-semibold" style={{ color: "#9b94ff" }}>
            {totalUnread} tin nhắn chưa đọc
          </span>
        </div>
      )}
      <div className="space-y-1">
        {matches.map((m) => {
          const unread = m.unread || 0;
          return (
            <button
              key={m.conversationId}
              onClick={() => router.push(`/messages/${m.userId}`)}
              className="w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl transition-all card-hover"
              style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
            >
              <Avatar
                initials={initialsFromName(m.displayName)}
                userId={m.userId}
                size="lg"
                photoUrl={m.primaryPhoto}
                online={m.online}
              />
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-0.5 gap-2">
                  <span className="font-bold text-sm truncate" style={{ color: "#e8eaf2" }}>
                    {m.displayName}
                  </span>
                  {m.lastMessageAt && (
                    <span className="text-xs flex-shrink-0" style={{ color: "#3a4060" }}>
                      {formatListTime(m.lastMessageAt)}
                    </span>
                  )}
                </div>
                <p
                  className="text-xs truncate"
                  style={{ color: unread > 0 ? "#a0a8c8" : "#6b74a0" }}
                >
                  {m.lastMessage || "Đã kết nối · Nhắn tin ngay"}
                </p>
              </div>
              {unread > 0 && (
                <span
                  className="flex-shrink-0 min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: "#6c63ff", color: "#fff" }}
                >
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {matches.length === 0 && (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">💬</p>
          <p className="text-sm font-semibold" style={{ color: "#6b74a0" }}>
            Chưa có cuộc trò chuyện nào
          </p>
          <p className="text-xs mt-2" style={{ color: "#3a4060" }}>
            Vào Gần đây và nhấn Kết bạn để bắt đầu chat
          </p>
        </div>
      )}
    </div>
  );
}

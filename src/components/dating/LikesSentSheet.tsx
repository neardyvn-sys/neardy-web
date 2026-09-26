"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { likesApi } from "@/lib/api";
import Avatar from "@/components/ui/Avatar";
import { initialsFromName } from "@/lib/types";

interface SentLikeItem {
  user_id: string;
  display_name: string;
  primary_photo: string | null;
  age?: number;
  bio?: string;
  gender?: string;
  kind: "like" | "superlike";
  created_at: string;
  matched: boolean;
  match_id?: string;
  conversation_id?: string;
  online?: boolean;
}

interface LikesSentSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Vừa xong";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return date.toLocaleDateString("vi-VN");
}

export default function LikesSentSheet({ isOpen, onClose }: LikesSentSheetProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"all" | "like" | "superlike">("all");
  const [items, setItems] = useState<SentLikeItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSentLikes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await likesApi.sentLikes({
        kind: tab === "all" ? undefined : tab,
      });
      setItems(res.likes || []);
    } catch (err) {
      console.error("Failed to fetch sent likes:", err);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    if (isOpen) {
      fetchSentLikes();
    }
  }, [isOpen, fetchSentLikes]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg max-h-[85vh] sm:max-h-[80vh] h-full flex flex-col bg-[#0d0f1a] border border-[#1e2240] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1e2240] flex items-center justify-between bg-[#111320]">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <div>
              <h2 className="text-base font-bold text-white">Lịch sử tương tác đã gửi</h2>
              <p className="text-[11px] text-gray-400">Danh sách người bạn đã gửi Thích & Super Like</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-300 text-sm transition-colors cursor-pointer"
            title="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Tab Filters */}
        <div className="px-5 py-3 border-b border-[#1e2240]/50 flex items-center gap-2 bg-[#0d0f1a]">
          <button
            onClick={() => setTab("all")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              tab === "all"
                ? "bg-gradient-to-r from-[#ff4b72] to-[#6c63ff] text-white shadow-md"
                : "bg-white/5 text-gray-400 hover:text-white"
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setTab("like")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              tab === "like"
                ? "bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/50"
                : "bg-white/5 text-gray-400 hover:text-white"
            }`}
          >
            <span>🩵</span> Đã thích
          </button>
          <button
            onClick={() => setTab("superlike")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              tab === "superlike"
                ? "bg-[#ffd700]/20 text-[#ffd700] border border-[#ffd700]/50"
                : "bg-white/5 text-gray-400 hover:text-white"
            }`}
          >
            <span>⭐</span> Super Like
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-gray-400">
              <div className="w-7 h-7 border-2 border-[#ff4b72] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Đang tải lịch sử...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-center text-gray-400">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-3xl">
                💌
              </div>
              <p className="text-sm font-semibold text-gray-300">Chưa có lượt tương tác nào</p>
              <p className="text-xs text-gray-500 max-w-xs">
                Khi bạn vuốt thích hoặc gửi Super Like cho ai đó, họ sẽ xuất hiện tại đây.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={`${item.user_id}-${item.created_at}`}
                className="p-3 rounded-2xl bg-[#131627] border border-[#1e2240] transition-all flex items-center justify-between gap-3"
              >
                {/* User Info */}
                <div
                  onClick={() => {
                    if (item.matched) {
                      onClose();
                      router.push(`/messages/${item.user_id}`);
                    }
                  }}
                  className={`flex items-center gap-3 min-w-0 flex-1 ${
                    item.matched ? "cursor-pointer group" : ""
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-13 h-13 rounded-full overflow-hidden bg-[#1a1d30] border border-white/10 flex items-center justify-center">
                      {item.primary_photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.primary_photo}
                          alt={item.display_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Avatar
                          initials={initialsFromName(item.display_name)}
                          userId={item.user_id}
                          size="md"
                        />
                      )}
                    </div>
                    {item.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#10b981] border-2 border-[#131627]" />
                    )}
                  </div>

                  <div className="min-w-0 space-y-0.5 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className={`text-sm font-bold text-white truncate ${item.matched ? "group-hover:text-[#ff4b72]" : ""}`}>
                        {item.display_name}
                      </h4>
                      {item.age && <span className="text-xs text-gray-400">({item.age})</span>}
                    </div>

                    <div className="flex items-center gap-2 text-[11px]">
                      {item.kind === "superlike" ? (
                        <span className="px-1.5 py-0.2 rounded-md bg-[#ffd700]/15 text-[#ffd700] font-semibold flex items-center gap-0.5">
                          ⭐ Super Like
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded-md bg-[#00e5ff]/15 text-[#00e5ff] font-semibold flex items-center gap-0.5">
                          🩵 Đã thích
                        </span>
                      )}
                      <span className="text-gray-500">• {timeAgo(item.created_at)}</span>
                    </div>

                    {item.bio && (
                      <p className="text-[11px] text-gray-400 line-clamp-1 truncate max-w-[180px] sm:max-w-xs">
                        {item.bio}
                      </p>
                    )}
                  </div>
                </div>

                {/* Status / Action Button */}
                <div className="flex-shrink-0">
                  {item.matched ? (
                    <button
                      onClick={() => {
                        onClose();
                        router.push(`/messages/${item.user_id}`);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#ff4b72] to-[#6c63ff] text-white text-xs font-bold shadow-md hover:opacity-95 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>💬</span> Nhắn tin
                    </button>
                  ) : (
                    <span className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-[11px] font-medium flex items-center gap-1 select-none">
                      <span>⏳</span> Chờ phản hồi
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

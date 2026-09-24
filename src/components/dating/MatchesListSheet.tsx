"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { likesApi } from "@/lib/api";
import Avatar from "@/components/ui/Avatar";
import { initialsFromName } from "@/lib/types";

interface MatchItem {
  match_id: string;
  conversation_id: string;
  user_id: string;
  display_name: string;
  primary_photo: string | null;
  created_at: string;
  unread_count: number;
  last_message?: string | null;
  last_message_at?: string | null;
  online?: boolean;
}

interface MatchesListSheetProps {
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

export default function MatchesListSheet({ isOpen, onClose }: MatchesListSheetProps) {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      likesApi
        .matches()
        .then((res) => {
          setMatches(res.matches || []);
        })
        .catch((err) => {
          console.error("Failed to load matches:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredMatches = matches.filter((m) =>
    m.display_name.toLowerCase().includes(search.toLowerCase().trim())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg max-h-[85vh] sm:max-h-[80vh] h-full flex flex-col bg-[#0d0f1a] border border-[#1e2240] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1e2240] flex items-center justify-between bg-[#111320]">
          <div className="flex items-center gap-2">
            <span className="text-xl">💖</span>
            <div>
              <h2 className="text-base font-bold text-white">Danh sách tương hợp (Matches)</h2>
              <p className="text-[11px] text-gray-400">
                {matches.length} người đã ghép đôi thành công với bạn
              </p>
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

        {/* Search Bar */}
        {matches.length > 3 && (
          <div className="px-4 py-2.5 border-b border-[#1e2240]/50 bg-[#0d0f1a]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Tìm kiếm theo tên..."
              className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#ff4b72]/50 transition-colors"
            />
          </div>
        )}

        {/* Content List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-gray-400">
              <div className="w-7 h-7 border-2 border-[#ff4b72] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Đang tải danh sách...</p>
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-center text-gray-400">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-3xl">
                💫
              </div>
              <p className="text-sm font-semibold text-gray-300">
                {search ? "Không tìm thấy kết quả phù hợp" : "Chưa có lượt tương hợp nào"}
              </p>
              <p className="text-xs text-gray-500 max-w-xs">
                Hãy tích cực quẹt thẻ để tìm thấy một nửa phù hợp nhé!
              </p>
            </div>
          ) : (
            filteredMatches.map((item) => (
              <div
                key={item.match_id}
                className="p-3 rounded-2xl bg-[#131627] border border-[#1e2240] hover:border-[#2a2f52] transition-all flex items-center justify-between gap-3"
              >
                {/* User Info */}
                <div
                  onClick={() => {
                    onClose();
                    router.push(`/messages/${item.conversation_id}`);
                  }}
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-13 h-13 rounded-full overflow-hidden bg-[#1a1d30] border border-white/10 group-hover:border-[#ff4b72]/50 flex items-center justify-center transition-all">
                      {item.primary_photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.primary_photo}
                          alt={item.display_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
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
                      <h4 className="text-sm font-bold text-white truncate group-hover:text-[#ff4b72] transition-colors">
                        {item.display_name}
                      </h4>
                      {item.online && (
                        <span className="text-[10px] text-[#00e5ff] font-semibold">● Online</span>
                      )}
                    </div>

                    <p className="text-[11px] text-gray-400 truncate">
                      {item.last_message || `Ghép đôi ${timeAgo(item.created_at)}`}
                    </p>
                  </div>
                </div>

                {/* Message Action Button */}
                <div className="flex-shrink-0">
                  <button
                    onClick={() => {
                      onClose();
                      router.push(`/messages/${item.conversation_id}`);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#ff4b72] to-[#6c63ff] text-white text-xs font-bold shadow-md hover:opacity-95 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>💬</span> Nhắn tin
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

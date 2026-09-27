"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { likesApi } from "@/lib/api";
import Avatar from "@/components/ui/Avatar";
import { initialsFromName } from "@/lib/types";
import MatchesListSheet from "@/components/dating/MatchesListSheet";

interface MatchItem {
  match_id: string;
  conversation_id: string;
  user_id: string;
  display_name: string;
  primary_photo: string | null;
  created_at: string;
  unread_count: number;
  last_message?: string | null;
  online?: boolean;
}

interface MatchesRowProps {
  onMatchCountChange?: (count: number) => void;
}

export default function MatchesRow({ onMatchCountChange }: MatchesRowProps) {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMatchesSheet, setShowMatchesSheet] = useState(false);

  useEffect(() => {
    let mounted = true;
    likesApi
      .matches()
      .then((res) => {
        if (!mounted) return;
        const list = (res.matches || []).filter((m) => m.is_friend !== false);
        setMatches(list);
        if (onMatchCountChange) {
          onMatchCountChange(list.length);
        }
      })
      .catch((err) => {
        console.error("Failed to load matches:", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [onMatchCountChange]);

  if (loading) {
    return (
      <div className="w-full px-4 py-2 flex items-center gap-3 overflow-x-auto no-scrollbar">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0 animate-pulse">
            <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10" />
            <div className="w-10 h-2 rounded bg-white/5" />
          </div>
        ))}
      </div>
    );
  }

  if (matches.length === 0) {
    return null;
  }

  return (
    <>
      <div className="w-full px-4 py-2 flex flex-col gap-1.5 border-b border-[#1e2240]/40">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#ff4b72] to-[#6c63ff]">
            Tương hợp mới ({matches.length})
          </span>

          <button
            onClick={() => setShowMatchesSheet(true)}
            className="text-[11px] font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            Xem tất cả ➔
          </button>
        </div>

      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
        {matches.map((item) => (
          <button
            key={item.match_id}
            onClick={() => router.push(`/messages/${item.user_id}`)}
            className="flex flex-col items-center gap-1 flex-shrink-0 group cursor-pointer text-left transition-transform active:scale-95"
            title={`Trò chuyện với ${item.display_name}`}
          >
            {/* Avatar with gradient ring */}
            <div className="relative p-[2px] rounded-full bg-gradient-to-tr from-[#ff4b72] via-[#a855f7] to-[#00e5ff] shadow-md group-hover:shadow-[#ff4b72]/30 transition-all">
              <div className="w-13 h-13 rounded-full overflow-hidden bg-[#111320] border-2 border-[#0a0c14] flex items-center justify-center">
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
                    className="w-full h-full text-sm font-bold"
                  />
                )}
              </div>

              {/* Online Indicator */}
              {item.online && (
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#10b981] border-2 border-[#0a0c14] shadow-sm" />
              )}

              {/* Unread badge */}
              {item.unread_count > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-[#ff4b72] text-[10px] font-bold text-white shadow-md">
                  {item.unread_count}
                </span>
              )}
            </div>

            {/* Display name */}
            <span className="text-[11px] font-semibold text-gray-200 max-w-[60px] truncate text-center group-hover:text-white">
              {item.display_name}
            </span>
          </button>
        ))}
      </div>
    </div>

    <MatchesListSheet
      isOpen={showMatchesSheet}
      onClose={() => setShowMatchesSheet(false)}
    />
  </>
  );
}

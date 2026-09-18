"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { visitsApi, VisitorUser } from "@/lib/api";
import Avatar from "@/components/ui/Avatar";
import { initialsFromName } from "@/lib/types";

interface VisitorsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateTotalCount?: (count: number) => void;
}

export default function VisitorsSheet({
  isOpen,
  onClose,
  onUpdateTotalCount,
}: VisitorsSheetProps) {
  const router = useRouter();
  const [visitors, setVisitors] = useState<VisitorUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    visitsApi
      .list(0, 50)
      .then((data) => {
        setVisitors(data.visitors || []);
        setTotalCount(data.total_count || 0);
        if (onUpdateTotalCount) {
          onUpdateTotalCount(data.total_count || 0);
        }
      })
      .catch((err) => {
        console.error("Failed to load visitors:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, onUpdateTotalCount]);

  // Categorize visitors into Today, This Week, Earlier
  const groupedVisitors = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;

    const today: VisitorUser[] = [];
    const thisWeek: VisitorUser[] = [];
    const earlier: VisitorUser[] = [];

    visitors.forEach((v) => {
      const vTime = new Date(v.visited_at).getTime();
      if (vTime >= startOfToday) {
        today.push(v);
      } else if (vTime >= sevenDaysAgo) {
        thisWeek.push(v);
      } else {
        earlier.push(v);
      }
    });

    return { today, thisWeek, earlier };
  }, [visitors]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full sm:max-w-md max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-[#1e2240] shadow-2xl overflow-hidden animate-slide-up"
        style={{ backgroundColor: "#111320", color: "#e8eaf2" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2240]">
          <div className="flex items-center gap-2">
            <span className="text-xl">👀</span>
            <h2 className="text-lg font-bold text-white">Lượt ghé thăm</h2>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[#00e5ff]/10 text-[#00e5ff]">
              {totalCount}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-400">
              <div className="w-6 h-6 border-2 border-[#00e5ff] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Đang tải lượt ghé thăm...</p>
            </div>
          ) : visitors.length === 0 ? (
            <div className="py-12 text-center text-gray-400 space-y-2">
              <p className="text-3xl">👻</p>
              <p className="font-medium text-white">Chưa có ai ghé thăm</p>
              <p className="text-xs text-gray-500">
                Hãy tích cực đăng bài và tương tác để thu hút lượt ghé thăm nhé!
              </p>
            </div>
          ) : (
            <>
              {/* Hôm nay */}
              {groupedVisitors.today.length > 0 && (
                <VisitorSection
                  title="Hôm nay"
                  color="#00e5ff"
                  dotColor="bg-[#00e5ff]"
                  badgeText="Hôm nay"
                  badgeBg="bg-[#00e5ff]/15 text-[#00e5ff]"
                  visitors={groupedVisitors.today}
                  onSelect={(id) => {
                    onClose();
                    router.push(`/wall/${id}`);
                  }}
                  onMessage={(id) => {
                    onClose();
                    router.push(`/messages/${id}`);
                  }}
                />
              )}

              {/* Tuần này */}
              {groupedVisitors.thisWeek.length > 0 && (
                <VisitorSection
                  title="Tuần này"
                  color="#9b94ff"
                  dotColor="bg-[#9b94ff]"
                  badgeText="Tuần này"
                  badgeBg="bg-[#9b94ff]/15 text-[#9b94ff]"
                  visitors={groupedVisitors.thisWeek}
                  onSelect={(id) => {
                    onClose();
                    router.push(`/wall/${id}`);
                  }}
                  onMessage={(id) => {
                    onClose();
                    router.push(`/messages/${id}`);
                  }}
                />
              )}

              {/* Trước đó */}
              {groupedVisitors.earlier.length > 0 && (
                <VisitorSection
                  title="Trước đó"
                  color="#6b7280"
                  dotColor="bg-gray-400"
                  badgeText="Trước đó"
                  badgeBg="bg-white/5 text-gray-400"
                  visitors={groupedVisitors.earlier}
                  onSelect={(id) => {
                    onClose();
                    router.push(`/wall/${id}`);
                  }}
                  onMessage={(id) => {
                    onClose();
                    router.push(`/messages/${id}`);
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function VisitorSection({
  title,
  dotColor,
  badgeBg,
  visitors,
  onSelect,
  onMessage,
}: {
  title: string;
  color: string;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
  visitors: VisitorUser[];
  onSelect: (id: string) => void;
  onMessage: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-1 border-b border-[#1e2240]/60">
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {title} ({visitors.length})
        </h3>
      </div>

      <div className="space-y-2">
        {visitors.map((v) => (
          <div
            key={v.id}
            onClick={() => onSelect(v.id)}
            className="flex items-center justify-between p-3 rounded-xl bg-[#171a2e] hover:bg-[#1e2240] transition-colors cursor-pointer border border-[#1e2240]/50"
          >
            <div className="flex items-center gap-3">
              <Avatar
                initials={initialsFromName(v.display_name)}
                userId={v.id}
                photoUrl={v.primary_photo}
                online={v.show_online && v.online}
                size="md"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-white hover:underline">
                    {v.display_name}
                  </span>
                  {v.age && <span className="text-xs text-gray-400">{v.age}t</span>}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                  {v.distance_km !== undefined && (
                    <span>📍 {v.distance_km} km</span>
                  )}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${badgeBg}`}>
                    {formatTimeAgo(v.visited_at)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onMessage(v.id)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#00e5ff]/10 text-[#00e5ff] hover:bg-[#00e5ff]/20 transition-colors flex items-center gap-1"
              >
                💬 Chat
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diffSec = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return "Vừa xong";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

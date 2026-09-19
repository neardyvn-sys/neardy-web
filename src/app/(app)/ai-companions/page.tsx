"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { aiApi, type AICompanion } from "@/lib/api";

const LEVEL_NAMES: Record<string, { label: string; icon: string; color: string }> = {
  Stranger: { label: "Người lạ", icon: "👤", color: "#94a3b8" },
  Friend: { label: "Bạn bè", icon: "🤝", color: "#38bdf8" },
  "Close Friend": { label: "Bạn thân", icon: "🌟", color: "#a855f7" },
  Crush: { label: "Thầm thích", icon: "💓", color: "#f43f5e" },
  Romantic: { label: "Người yêu", icon: "❤️", color: "#ff4b72" },
};

export default function AICompanionsPage() {
  const [companions, setCompanions] = useState<AICompanion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    aiApi
      .companions()
      .then((res) => {
        setCompanions(res.companions || []);
      })
      .catch((err) => {
        setError(err.message || "Không thể tải danh sách AI Companion");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 py-6 max-w-md mx-auto min-h-screen">
      <div className="mb-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-2"
             style={{ backgroundColor: "rgba(108, 99, 255, 0.15)", color: "#8b5cf6", border: "1px solid rgba(108, 99, 255, 0.3)" }}>
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
          <span>AI Companion · Trợ lý ảo Neardy</span>
        </div>
        <h1 className="text-2xl font-extrabold" style={{ color: "#f8fafc" }}>
          Bạn Đồng Hành AI
        </h1>
        <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>
          Lắng nghe, chia sẻ và gắn kết cảm xúc cùng bạn mọi lúc
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="p-5 rounded-2xl animate-pulse" style={{ backgroundColor: "#14172b" }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-slate-800 rounded" />
                  <div className="h-3 w-40 bg-slate-800 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl text-center text-sm" style={{ backgroundColor: "rgba(244,63,94,0.1)", color: "#f43f5e" }}>
          {error}
        </div>
      ) : (
        <div className="space-y-4">
          {companions.map((comp) => {
            const relInfo = LEVEL_NAMES[comp.level] || { label: comp.level, icon: "💬", color: "#6c63ff" };
            const progressPct = Math.min(100, Math.round((comp.affection_points / (comp.next_level_points || 1)) * 100));

            return (
              <div
                key={comp.id}
                className="p-5 rounded-2xl transition-all border hover:border-purple-500/40 relative overflow-hidden"
                style={{
                  backgroundColor: "#14172b",
                  borderColor: "rgba(255,255,255,0.07)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg shrink-0"
                       style={{ background: "linear-gradient(135deg, #2e1065, #3b0764)" }}>
                    {comp.avatar || "🌸"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        {comp.name}
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: `${relInfo.color}20`, color: relInfo.color }}>
                          {relInfo.icon} {relInfo.label}
                        </span>
                      </h2>
                    </div>

                    <p className="text-xs mt-1 line-clamp-2" style={{ color: "#94a3b8" }}>
                      {comp.personality}
                    </p>

                    {/* Affection Progress Bar */}
                    <div className="mt-3">
                      <div className="flex justify-between items-center text-[10px] mb-1 font-semibold" style={{ color: "#cbd5e1" }}>
                        <span>Điểm tình cảm</span>
                        <span style={{ color: relInfo.color }}>
                          {comp.affection_points} / {comp.next_level_points} pt
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#1e2240" }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${progressPct}%`,
                            background: `linear-gradient(90deg, #6c63ff, ${relInfo.color})`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 flex justify-end border-t border-slate-800/60">
                  <Link
                    href={`/ai-companions/${comp.id}`}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-2 hover:opacity-95 active:scale-95 shadow-md"
                    style={{ background: "linear-gradient(135deg, #6c63ff, #8b5cf6)" }}
                  >
                    <span>Trò chuyện ngay</span>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

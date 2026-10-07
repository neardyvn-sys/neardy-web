"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FilterTab, NearbyFilters, NearbyGender, NearbyUser } from "@/lib/types";
import { formatDist } from "@/lib/geo";
import Avatar from "@/components/ui/Avatar";
import ChatPanel from "@/components/chat/ChatPanel";
import { useApp } from "@/components/providers/AppProvider";

const GENDER_OPTIONS: { id: NearbyGender; label: string }[] = [
  { id: "woman", label: "Nữ" },
  { id: "man", label: "Nam" },
  { id: "nonbinary", label: "Khác" },
];

const DEFAULT_FILTERS: Required<NearbyFilters> = {
  minAge: 18,
  maxAge: 40,
  maxDistanceKm: 50,
  genders: [],
  visibilityGender: "all",
};

function filtersActive(f: NearbyFilters) {
  return (
    (f.minAge != null && f.minAge !== DEFAULT_FILTERS.minAge) ||
    (f.maxAge != null && f.maxAge !== DEFAULT_FILTERS.maxAge) ||
    (f.maxDistanceKm != null && f.maxDistanceKm !== DEFAULT_FILTERS.maxDistanceKm) ||
    (f.genders != null && f.genders.length > 0) ||
    (f.visibilityGender != null && f.visibilityGender !== "all")
  );
}

function renderGenderIcon(gender?: string | null) {
  if (!gender) return null;
  const g = gender.toLowerCase();
  if (g === "woman" || g === "female") {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ff4b72" strokeWidth="2.5" className="inline shrink-0">
        <circle cx="12" cy="9" r="6" />
        <path d="M12 15v7M9 19h6" />
      </svg>
    );
  }
  if (g === "man" || g === "male") {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2.5" className="inline shrink-0">
        <circle cx="10" cy="14" r="6" />
        <path d="M14 10l6-6M15 4h5v5" />
      </svg>
    );
  }
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" className="inline shrink-0">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 7V2M9 4h6M16 16l4 4M17 19l2.5-2.5" />
    </svg>
  );
}

function FilterSheet({
  open,
  value,
  applying,
  onClose,
  onApply,
}: {
  open: boolean;
  value: NearbyFilters;
  applying: boolean;
  onClose: () => void;
  onApply: (next: NearbyFilters) => void;
}) {
  const [draft, setDraft] = useState<NearbyFilters>(value);

  useEffect(() => {
    if (open) setDraft({ ...DEFAULT_FILTERS, ...value });
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const minAge = draft.minAge ?? DEFAULT_FILTERS.minAge;
  const maxAge = draft.maxAge ?? DEFAULT_FILTERS.maxAge;
  const maxDistanceKm = draft.maxDistanceKm ?? DEFAULT_FILTERS.maxDistanceKm;
  const genders = draft.genders ?? [];
  const visibilityGender = draft.visibilityGender ?? "all";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md flex flex-col slide-up max-h-[85vh]"
        style={{
          backgroundColor: "#111320",
          border: "1px solid #1e2240",
          borderBottom: "none",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center pt-3 pb-2 shrink-0">
          <span className="w-10 h-1 rounded-full" style={{ backgroundColor: "#2e3454" }} />
        </div>

        <div className="flex items-center justify-between px-5 pb-3 shrink-0">
          <h3 className="font-extrabold text-base" style={{ color: "#e8eaf2" }}>
            Bộ lọc
          </h3>
          <button
            type="button"
            onClick={() => setDraft({ ...DEFAULT_FILTERS })}
            className="text-xs font-semibold hover:opacity-80"
            style={{ color: "#9b94ff" }}
          >
            Đặt lại
          </button>
        </div>

        <div className="px-5 pb-5 space-y-6 overflow-y-auto flex-1">
          {/* PHẦN 1: ĐỐI TƯỢNG TÌM KIẾM */}
          <div className="space-y-4">
            <div className="pb-1.5 border-b border-purple-900/40">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                1. Đối tượng tìm kiếm
              </span>
            </div>

            {/* Độ tuổi */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold" style={{ color: "#a0a8c8" }}>
                  Độ tuổi
                </p>
                <p className="text-xs font-mono font-bold" style={{ color: "#9b94ff" }}>
                  {minAge} – {maxAge} tuổi
                </p>
              </div>
              <div className="space-y-3">
                <label className="block">
                  <div className="flex justify-between text-[10px] mb-1" style={{ color: "#6b74a0" }}>
                    <span>Từ: {minAge} tuổi</span>
                  </div>
                  <input
                    type="range"
                    min={18}
                    max={60}
                    value={minAge}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setDraft((p) => ({
                        ...p,
                        minAge: v,
                        maxAge: Math.max(v, p.maxAge ?? DEFAULT_FILTERS.maxAge),
                      }));
                    }}
                    className="w-full accent-[#6c63ff]"
                  />
                </label>
                <label className="block">
                  <div className="flex justify-between text-[10px] mb-1" style={{ color: "#6b74a0" }}>
                    <span>Đến: {maxAge} tuổi</span>
                  </div>
                  <input
                    type="range"
                    min={18}
                    max={60}
                    value={maxAge}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setDraft((p) => ({
                        ...p,
                        maxAge: v,
                        minAge: Math.min(v, p.minAge ?? DEFAULT_FILTERS.minAge),
                      }));
                    }}
                    className="w-full accent-[#6c63ff]"
                  />
                </label>
              </div>
            </div>

            {/* Giới tính */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: "#a0a8c8" }}>
                Giới tính
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "man" as NearbyGender, label: "Nam" },
                  { id: "woman" as NearbyGender, label: "Nữ" },
                  { id: "all" as const, label: "Tất cả" },
                ].map((opt) => {
                  const isAll = genders.length === 0;
                  const active = opt.id === "all" ? isAll : genders.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        if (opt.id === "all") {
                          setDraft((p) => ({ ...p, genders: [] }));
                        } else {
                          setDraft((p) => ({ ...p, genders: [opt.id as NearbyGender] }));
                        }
                      }}
                      className="py-2.5 rounded-xl text-xs font-bold transition-all text-center"
                      style={
                        active
                          ? { backgroundColor: "#6c63ff", color: "#fff", boxShadow: "0 2px 10px rgba(108,99,255,0.4)" }
                          : { backgroundColor: "#1a1d2e", color: "#6b74a0", border: "1px solid #282c4d" }
                      }
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Khoảng cách */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold" style={{ color: "#a0a8c8" }}>
                  Khoảng cách
                </p>
                <p className="text-xs font-mono font-bold" style={{ color: "#9b94ff" }}>
                  ≤ {maxDistanceKm} km
                </p>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                value={maxDistanceKm}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, maxDistanceKm: Number(e.target.value) }))
                }
                className="w-full accent-[#6c63ff]"
              />
              <div className="flex justify-between text-[10px] mt-1" style={{ color: "#3a4060" }}>
                <span>1 km</span>
                <span>100 km</span>
              </div>
            </div>
          </div>

          {/* PHẦN 2: AI CÓ THỂ TÌM THẤY BẠN */}
          <div className="space-y-3 pt-2">
            <div className="pb-1.5 border-b border-cyan-900/40">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                2. Ai có thể tìm thấy bạn
              </span>
            </div>

            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: "#a0a8c8" }}>
                Giới tính
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "man" as const, label: "Nam" },
                  { id: "woman" as const, label: "Nữ" },
                  { id: "all" as const, label: "Tất cả" },
                ].map((opt) => {
                  const active = visibilityGender === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setDraft((p) => ({ ...p, visibilityGender: opt.id }));
                      }}
                      className="py-2.5 rounded-xl text-xs font-bold transition-all text-center"
                      style={
                        active
                          ? { backgroundColor: "#00e5ff", color: "#0a0c14", boxShadow: "0 2px 10px rgba(0,229,255,0.3)" }
                          : { backgroundColor: "#1a1d2e", color: "#6b74a0", border: "1px solid #282c4d" }
                      }
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4" style={{ borderTop: "1px solid #1e2240" }}>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl text-xs font-bold"
            style={{ backgroundColor: "#1a1d2e", color: "#a0a8c8" }}
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={applying}
            onClick={() => onApply(draft)}
            className="flex-1 py-3 rounded-2xl text-xs font-bold"
            style={{
              background: "linear-gradient(135deg, #6c63ff, #5b54e8)",
              color: "#fff",
              opacity: applying ? 0.7 : 1,
            }}
          >
            {applying ? "Đang lọc…" : "Áp dụng"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NearbyList({
  users,
  permissionState,
  friends,
}: {
  users: NearbyUser[];
  permissionState: string;
  friends: Set<string>;
  onToggleFriend?: (id: string) => Promise<{ conversationId?: string; matched: boolean }>;
  onPass?: (id: string) => Promise<void>;
}) {
  const router = useRouter();
  const { user, matches, refreshNearby } = useApp();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [chatPeer, setChatPeer] = useState<NearbyUser | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [nearbyFilters, setNearbyFilters] = useState<NearbyFilters>({ ...DEFAULT_FILTERS });
  const [applying, setApplying] = useState(false);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (nearbyFilters.minAge !== DEFAULT_FILTERS.minAge) n += 1;
    if (nearbyFilters.maxAge !== DEFAULT_FILTERS.maxAge) n += 1;
    if (nearbyFilters.maxDistanceKm !== DEFAULT_FILTERS.maxDistanceKm) n += 1;
    if ((nearbyFilters.genders?.length || 0) > 0) n += 1;
    return n;
  }, [nearbyFilters]);

  const filtered = users
    .filter((u) => (filter === "online" ? u.online : true))
    .filter((u) =>
      searchQuery
        ? u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.status.toLowerCase().includes(searchQuery.toLowerCase())
        : true,
    );

  const openChat = (u: NearbyUser) => {
    setChatPeer(u);
  };

  const match = chatPeer ? matches.find((m) => m.userId === chatPeer.id) : undefined;

  const applyFilters = async (next: NearbyFilters) => {
    setApplying(true);
    try {
      const payload: NearbyFilters = {
        minAge: next.minAge ?? DEFAULT_FILTERS.minAge,
        maxAge: next.maxAge ?? DEFAULT_FILTERS.maxAge,
        maxDistanceKm: next.maxDistanceKm ?? DEFAULT_FILTERS.maxDistanceKm,
        genders: next.genders?.length ? next.genders : [],
      };
      setNearbyFilters(payload);
      await refreshNearby(
        filtersActive(payload)
          ? payload
          : {
              // still send defaults so distance/age override profile if user kept defaults intentionally
              minAge: payload.minAge,
              maxAge: payload.maxAge,
              maxDistanceKm: payload.maxDistanceKm,
              genders: payload.genders,
            },
      );
      setShowFilters(false);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="px-4 pb-4">
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-3"
        style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
      >
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#6b74a0" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Tìm kiếm người dùng..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent outline-none text-sm w-full"
          style={{ color: "#e8eaf2" }}
        />
      </div>
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex gap-1 flex-wrap">
          {(["all", "online"] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
              style={
                filter === tab
                  ? { backgroundColor: "#6c63ff", color: "#fff" }
                  : { backgroundColor: "#1a1d2e", color: "#6b74a0" }
              }
            >
              {tab === "all" ? "Tất cả" : "🟢 Online"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full relative"
            style={
              activeFilterCount > 0
                ? { backgroundColor: "rgba(108,99,255,0.2)", color: "#9b94ff" }
                : { backgroundColor: "#1a1d2e", color: "#a0a8c8" }
            }
          >
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M4 4h16l-6 7.5V20l-4-2v-6.5L4 4z" />
            </svg>
            Lọc
            {activeFilterCount > 0 && (
              <span
                className="ml-0.5 min-w-4 h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ backgroundColor: "#6c63ff", color: "#fff" }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>
      {permissionState === "loading" ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <p className="text-xs mb-3" style={{ color: "#6b74a0" }}>
            {filtered.length} người trong khu vực
            {activeFilterCount > 0 ? " · đã lọc" : ""}
          </p>
          <div className="space-y-2">
            {filtered.map((u, idx) => (
              <button
                key={u.id}
                type="button"
                onClick={() => router.push(`/messages/${u.id}`)}
                className="w-full text-left card-hover rounded-2xl p-4 slide-up"
                style={{
                  backgroundColor: "#111320",
                  border: "1px solid #1e2240",
                  animationDelay: `${idx * 40}ms`,
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    role="link"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/wall/${u.id}`);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        router.push(`/wall/${u.id}`);
                      }
                    }}
                    className="relative flex-shrink-0"
                  >
                    <Avatar initials={u.avatar} userId={u.id} size="lg" online={u.online} photoUrl={u.photoUrl} />
                  </span>
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                    {/* Div 1: Tên, Icon giới tính + Tuổi, Icon vị trí + Khoảng cách */}
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm truncate text-left" style={{ color: "#e8eaf2" }}>
                        {u.name}
                      </div>
                      <div className="flex items-center gap-2.5 text-xs mt-1" style={{ color: "#a0a8c8" }}>
                        {u.age ? (
                          <span className="flex items-center gap-1">
                            {renderGenderIcon(u.gender)}
                            <span>{u.age}</span>
                          </span>
                        ) : u.gender ? (
                          <span className="flex items-center gap-1">
                            {renderGenderIcon(u.gender)}
                          </span>
                        ) : null}
                        <span className="flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="shrink-0 text-purple-400">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                            <circle cx="12" cy="9" r="2.5" />
                          </svg>
                          <span>{formatDist(u.distanceKm)}</span>
                        </span>
                      </div>
                    </div>

                    {/* Div 2: Bio */}
                    <div className="text-right shrink-0 max-w-[45%]">
                      <p className="text-xs truncate" style={{ color: "#8a94b8" }}>
                        {u.bio || u.status || ""}
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🔭</p>
              <p className="text-sm font-semibold" style={{ color: "#6b74a0" }}>
                Không tìm thấy ai gần đây
              </p>
              <p className="text-xs mt-2" style={{ color: "#3a4060" }}>
                Thử nới lỏng bộ lọc tuổi / giới tính / khoảng cách
              </p>
              <button
                type="button"
                onClick={() => setShowFilters(true)}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-bold"
                style={{ backgroundColor: "#1a1d2e", color: "#9b94ff" }}
              >
                Chỉnh bộ lọc
              </button>
            </div>
          )}
        </>
      )}

      {chatPeer && user && (
        <ChatPanel
          peer={chatPeer}
          myId={user.id}
          myName={user.name}
          myAvatar={user.avatar}
          conversationId={match?.conversationId}
          isFriend={friends.has(chatPeer.id)}
          onClose={() => setChatPeer(null)}
        />
      )}

      <FilterSheet
        open={showFilters}
        value={nearbyFilters}
        applying={applying}
        onClose={() => setShowFilters(false)}
        onApply={(next) => void applyFilters(next)}
      />
    </div>
  );
}

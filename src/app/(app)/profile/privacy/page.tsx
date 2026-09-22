"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers/AppProvider";
import { activityHidesApi, blocksApi, meApi, type PrivacySettings } from "@/lib/api";
import { initialsFromName } from "@/lib/types";

const DEFAULT_PRIVACY: PrivacySettings = {
  nearby_visibility: "everyone",
  wall_visibility: "everyone",
  show_age: true,
  show_distance: true,
  show_online: true,
  message_permission: "everyone",
};

function Toggle({
  on,
  disabled,
  onChange,
}: {
  on: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className="relative w-11 h-6 rounded-full flex-shrink-0 transition-colors"
      style={{
        backgroundColor: on ? "#6c63ff" : "#2e3454",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform"
        style={{
          backgroundColor: "#fff",
          transform: on ? "translateX(20px)" : "translateX(0)",
        }}
      />
    </button>
  );
}

function OptionRow({
  label,
  sub,
  selected,
  onClick,
}: {
  label: string;
  sub: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      style={{ backgroundColor: "#111320" }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: "#e8eaf2" }}>
          {label}
        </p>
        <p className="text-xs" style={{ color: "#6b74a0" }}>
          {sub}
        </p>
      </div>
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          border: selected ? "2px solid #6c63ff" : "2px solid #2e3454",
          backgroundColor: selected ? "#6c63ff" : "transparent",
        }}
      >
        {selected ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : null}
      </span>
    </button>
  );
}

export default function PrivacySettingsPage() {
  const { user } = useApp();
  const router = useRouter();
  const [privacy, setPrivacy] = useState<PrivacySettings>(DEFAULT_PRIVACY);
  const [blocks, setBlocks] = useState<
    { user_id: string; display_name: string; primary_photo: string | null }[]
  >([]);
  const [activityHides, setActivityHides] = useState<
    { user_id: string; display_name: string; primary_photo: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const [p, b, ah] = await Promise.all([
          meApi.privacy(),
          blocksApi.list(),
          activityHidesApi.list(),
        ]);
        setPrivacy(p);
        setBlocks(b.blocks || []);
        setActivityHides(ah.activity_hides || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Không tải được cài đặt");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (!user) return null;

  const patch = async (partial: Partial<PrivacySettings>) => {
    setSaving(true);
    setError("");
    const prev = privacy;
    setPrivacy({ ...prev, ...partial });
    try {
      const next = await meApi.patchPrivacy(partial);
      setPrivacy(next);
    } catch (e) {
      setPrivacy(prev);
      setError(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const unblock = async (userId: string) => {
    try {
      await blocksApi.unblock(userId);
      setBlocks((prev) => prev.filter((b) => b.user_id !== userId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bỏ chặn thất bại");
    }
  };

  const unhideActivity = async (userId: string) => {
    try {
      await activityHidesApi.unhide(userId);
      setActivityHides((prev) => prev.filter((ah) => ah.user_id !== userId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bỏ ẩn hoạt động thất bại");
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0c14", color: "#e8eaf2" }}>
      <div
        className="flex items-center gap-3 px-4 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid #1e2240" }}
      >
        <button type="button" onClick={() => router.push("/profile")} style={{ color: "#6b74a0" }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <span className="font-extrabold text-base" style={{ color: "#e8eaf2" }}>
          Quyền riêng tư
        </span>
        {saving ? (
          <span className="ml-auto text-xs" style={{ color: "#6b74a0" }}>
            Đang lưu…
          </span>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-md mx-auto w-full">
        {error ? (
          <p
            className="text-xs rounded-xl px-3 py-2.5"
            style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#f87171" }}
          >
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="skeleton h-40 rounded-2xl" />
        ) : (
          <>
            <div>
              <p className="text-xs font-bold px-1 mb-2" style={{ color: "#6b74a0" }}>
                HIỆN TRÊN NEARBY
              </p>
              <div className="rounded-2xl overflow-hidden divide-y" style={{ border: "1px solid #1e2240" }}>
                {(
                  [
                    { id: "everyone" as const, label: "Mọi người", sub: "Ai cũng có thể thấy bạn gần đây" },
                    { id: "matches" as const, label: "Chỉ bạn bè", sub: "Chỉ người đã kết nối mới thấy" },
                    { id: "hidden" as const, label: "Ẩn hoàn toàn", sub: "Không hiện trên Nearby" },
                  ] as const
                ).map((opt, i, arr) => (
                  <div key={opt.id} style={{ borderBottom: i < arr.length - 1 ? "1px solid #1e2240" : "none" }}>
                    <OptionRow
                      label={opt.label}
                      sub={opt.sub}
                      selected={privacy.nearby_visibility === opt.id}
                      onClick={() => void patch({ nearby_visibility: opt.id })}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* HIỆN TRÊN NEARBY */}
            <div>
              <p className="text-xs font-bold px-1 mb-2 tracking-wider" style={{ color: "#6b74a0" }}>
                HIỆN TRÊN NEARBY
              </p>
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2240" }}>
                {(
                  [
                    { id: "everyone" as const, label: "Mọi người", sub: "Ai cũng có thể thấy bạn gần đây" },
                    { id: "matches" as const, label: "Chỉ bạn bè", sub: "Chỉ người đã kết nối mới thấy" },
                    { id: "hidden" as const, label: "Ẩn hoàn toàn", sub: "Không hiện trên Nearby" },
                  ] as const
                ).map((opt, i, arr) => (
                  <div key={opt.id} style={{ borderBottom: i < arr.length - 1 ? "1px solid #1e2240" : "none" }}>
                    <OptionRow
                      label={opt.label}
                      sub={opt.sub}
                      selected={privacy.nearby_visibility === opt.id}
                      onClick={() => void patch({ nearby_visibility: opt.id })}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* TƯỜNG / NHẬT KÝ */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1 pt-1">
                <span className="text-sm">📝</span>
                <p className="text-xs font-extrabold tracking-wider" style={{ color: "#8a94b8" }}>
                  TƯỜNG / NHẬT KÝ
                </p>
              </div>

              {/* Nhóm 1: Cho phép xem và bình luận */}
              <div className="rounded-2xl p-3.5 space-y-3" style={{ backgroundColor: "#0e101c", border: "1px solid #1e2240" }}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#9b94ff" }}>
                    1. Cho phép xem và bình luận
                  </p>
                </div>

                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #232747" }}>
                  <div className="px-3 py-2 text-[11px] font-medium" style={{ backgroundColor: "#141727", color: "#8a94b8" }}>
                    Ai có thể xem nhật ký của tôi
                  </div>
                  {(
                    [
                      { id: "everyone" as const, label: "Công khai", sub: "Ai cũng xem được nhật ký" },
                      { id: "friends" as const, label: "Bạn bè", sub: "Chỉ người đã kết nối" },
                      { id: "private" as const, label: "Chỉ mình tôi", sub: "Ẩn tường với người khác" },
                    ] as const
                  ).map((opt, i, arr) => (
                    <div key={opt.id} style={{ borderBottom: i < arr.length - 1 ? "1px solid #1e2240" : "none" }}>
                      <OptionRow
                        label={opt.label}
                        sub={opt.sub}
                        selected={privacy.wall_visibility === opt.id}
                        onClick={() => void patch({ wall_visibility: opt.id })}
                      />
                    </div>
                  ))}
                </div>

                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #232747" }}>
                  <div className="px-3 py-2 text-[11px] font-medium" style={{ backgroundColor: "#141727", color: "#8a94b8" }}>
                    Ai có thể nhắn tin & kết nối
                  </div>
                  {(
                    [
                      { id: "everyone" as const, label: "Mọi người", sub: "Ai cũng có thể kết nối / nhắn" },
                      { id: "friends" as const, label: "Chỉ bạn bè", sub: "Chỉ người đã kết nối mới nhắn được" },
                    ] as const
                  ).map((opt, i, arr) => (
                    <div key={opt.id} style={{ borderBottom: i < arr.length - 1 ? "1px solid #1e2240" : "none" }}>
                      <OptionRow
                        label={opt.label}
                        sub={opt.sub}
                        selected={privacy.message_permission === opt.id}
                        onClick={() => void patch({ message_permission: opt.id })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Nhóm 2: Chặn và ẩn */}
              <div className="rounded-2xl p-3.5 space-y-3" style={{ backgroundColor: "#0e101c", border: "1px solid #1e2240" }}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#f87171" }}>
                    2. Chặn và ẩn
                  </p>
                </div>

                {/* Danh sách chặn */}
                <div>
                  <p className="text-[11px] font-semibold px-1 mb-1.5" style={{ color: "#8a94b8" }}>
                    🚫 Người bị chặn xem nhật ký & tương tác ({blocks.length})
                  </p>
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #232747" }}>
                    {blocks.length === 0 ? (
                      <p className="px-4 py-3 text-xs" style={{ backgroundColor: "#111320", color: "#6b74a0" }}>
                        Chưa chặn ai
                      </p>
                    ) : (
                      blocks.map((b, i) => (
                        <div
                          key={b.user_id}
                          className="flex items-center gap-3 px-4 py-2.5"
                          style={{
                            backgroundColor: "#111320",
                            borderBottom: i < blocks.length - 1 ? "1px solid #1e2240" : "none",
                          }}
                        >
                          {b.primary_photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={b.primary_photo}
                              alt=""
                              className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                              {initialsFromName(b.display_name)}
                            </div>
                          )}
                          <p className="flex-1 text-xs font-semibold truncate" style={{ color: "#e8eaf2" }}>
                            {b.display_name}
                          </p>
                          <button
                            type="button"
                            onClick={() => void unblock(b.user_id)}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors hover:bg-[#252a45]"
                            style={{ backgroundColor: "#1a1d2e", color: "#f87171" }}
                          >
                            Bỏ chặn
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Danh sách ẩn hoạt động */}
                <div>
                  <p className="text-[11px] font-semibold px-1 mb-1.5" style={{ color: "#8a94b8" }}>
                    👁️‍🗨️ Người bị ẩn hoạt động khỏi nhật ký / bảng tin ({activityHides.length})
                  </p>
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #232747" }}>
                    {activityHides.length === 0 ? (
                      <p className="px-4 py-3 text-xs" style={{ backgroundColor: "#111320", color: "#6b74a0" }}>
                        Chưa ẩn hoạt động của ai
                      </p>
                    ) : (
                      activityHides.map((ah, i) => (
                        <div
                          key={ah.user_id}
                          className="flex items-center gap-3 px-4 py-2.5"
                          style={{
                            backgroundColor: "#111320",
                            borderBottom: i < activityHides.length - 1 ? "1px solid #1e2240" : "none",
                          }}
                        >
                          {ah.primary_photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={ah.primary_photo}
                              alt=""
                              className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                              {initialsFromName(ah.display_name)}
                            </div>
                          )}
                          <p className="flex-1 text-xs font-semibold truncate" style={{ color: "#e8eaf2" }}>
                            {ah.display_name}
                          </p>
                          <button
                            type="button"
                            onClick={() => void unhideActivity(ah.user_id)}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors hover:bg-[#252a45]"
                            style={{ backgroundColor: "#1a1d2e", color: "#9b94ff" }}
                          >
                            Bỏ ẩn
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* HIỂN THỊ THÔNG TIN */}
            <div>
              <p className="text-xs font-bold px-1 mb-2 tracking-wider" style={{ color: "#6b74a0" }}>
                HIỂN THỊ THÔNG TIN
              </p>
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2240" }}>
                {(
                  [
                    { key: "show_age" as const, label: "Hiện tuổi", sub: "Cho người khác thấy tuổi của bạn" },
                    {
                      key: "show_distance" as const,
                      label: "Hiện khoảng cách",
                      sub: "Cho người khác thấy bạn cách bao xa",
                    },
                    {
                      key: "show_online" as const,
                      label: "Hiện đang online",
                      sub: "Cho người khác thấy trạng thái online",
                    },
                  ] as const
                ).map((item, i, arr) => (
                  <div
                    key={item.key}
                    className="flex items-center gap-3 px-4 py-4"
                    style={{
                      backgroundColor: "#111320",
                      borderBottom: i < arr.length - 1 ? "1px solid #1e2240" : "none",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: "#e8eaf2" }}>
                        {item.label}
                      </p>
                      <p className="text-xs" style={{ color: "#6b74a0" }}>
                        {item.sub}
                      </p>
                    </div>
                    <Toggle
                      on={privacy[item.key]}
                      disabled={saving}
                      onChange={(v) => void patch({ [item.key]: v })}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

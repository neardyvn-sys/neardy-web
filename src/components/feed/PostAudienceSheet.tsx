"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import { useApp } from "@/components/providers/AppProvider";
import { feedApi } from "@/lib/api";
import type { PostAudienceType } from "@/lib/types";
import { initialsFromName } from "@/lib/types";

export type { PostAudienceType };

export interface PostAudienceSetting {
  type: PostAudienceType;
  selectedUserIds?: string[];
}

interface PostAudienceSheetProps {
  open: boolean;
  postId?: string;
  initialType?: PostAudienceType;
  initialSelectedIds?: string[];
  onClose: () => void;
  onSave?: (setting: PostAudienceSetting) => void;
}

export default function PostAudienceSheet({
  open,
  postId,
  initialType = "friends",
  initialSelectedIds = [],
  onClose,
  onSave,
}: PostAudienceSheetProps) {
  const router = useRouter();
  const app = useApp();
  const matches = app?.matches || [];

  const [step, setStep] = useState<"main" | "picker">("main");
  const [selectedType, setSelectedType] = useState<PostAudienceType>(initialType);
  const [includeFriends, setIncludeFriends] = useState<string[]>(
    initialType === "custom_include" ? initialSelectedIds : [],
  );
  const [excludeFriends, setExcludeFriends] = useState<string[]>(
    initialType === "custom_exclude" ? initialSelectedIds : [],
  );
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Initialize only when modal opens
  useEffect(() => {
    if (open) {
      setStep("main");
      setSelectedType(initialType);
      setIncludeFriends(initialType === "custom_include" ? initialSelectedIds || [] : []);
      setExcludeFriends(initialType === "custom_exclude" ? initialSelectedIds || [] : []);
      setSearch("");
      setError("");
      setSuccess(false);
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const activeSelectedFriends =
    selectedType === "custom_include"
      ? includeFriends
      : selectedType === "custom_exclude"
        ? excludeFriends
        : [];

  const toggleFriend = (id: string) => {
    if (selectedType === "custom_include") {
      setIncludeFriends((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
    } else if (selectedType === "custom_exclude") {
      setExcludeFriends((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
    }
  };

  const filteredMatches = matches.filter((m) =>
    m.displayName.toLowerCase().includes(search.toLowerCase().trim()),
  );

  const handleSelectAll = () => {
    const allIds = filteredMatches.map((m) => m.userId);
    if (selectedType === "custom_include") {
      setIncludeFriends(allIds);
    } else if (selectedType === "custom_exclude") {
      setExcludeFriends(allIds);
    }
  };

  const handleDeselectAll = () => {
    if (selectedType === "custom_include") {
      setIncludeFriends([]);
    } else if (selectedType === "custom_exclude") {
      setExcludeFriends([]);
    }
  };

  const handleSave = async (overrideType?: PostAudienceType, overrideFriends?: string[]) => {
    const targetType = overrideType || selectedType;
    let targetFriends = overrideFriends;
    if (!targetFriends) {
      if (targetType === "custom_include") {
        targetFriends = includeFriends;
      } else if (targetType === "custom_exclude") {
        targetFriends = excludeFriends;
      } else {
        targetFriends = [];
      }
    }

    setError("");
    if (
      (targetType === "custom_include" || targetType === "custom_exclude") &&
      targetFriends.length === 0
    ) {
      setError("Vui lòng chọn ít nhất 1 bạn bè trong danh sách");
      return;
    }

    setSaving(true);
    try {
      if (postId) {
        await feedApi.updateAudience(postId, {
          type: targetType,
          selectedUserIds: targetFriends,
        });
      }

      onSave?.({
        type: targetType,
        selectedUserIds: targetFriends,
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 300);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật quyền xem thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectOption = (type: PostAudienceType) => {
    setSelectedType(type);
    setError("");
    if (type === "custom_include" || type === "custom_exclude") {
      setSearch("");
      setStep("picker");
    }
  };

  const options: {
    type: PostAudienceType;
    label: string;
    subLabel: string;
    icon: string;
    hasSubPage?: boolean;
  }[] = [
    {
      type: "friends",
      label: "Bạn bè",
      subLabel: "trừ bạn bè đã bị chặn xem",
      icon: "👥",
    },
    {
      type: "private",
      label: "Mình tôi",
      subLabel: "chỉ mình bạn được xem",
      icon: "🔒",
    },
    {
      type: "custom_include",
      label: "Bạn bè từ danh bạ",
      subLabel: "Chọn bạn bè được xem từ danh bạ",
      icon: "👤➕",
      hasSubPage: true,
    },
    {
      type: "custom_exclude",
      label: "Bạn bè ngoại trừ...",
      subLabel: "Chọn bạn bè không được xem",
      icon: "🚫",
      hasSubPage: true,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(5px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl flex flex-col max-h-[90vh] h-[580px] slide-up overflow-hidden"
        style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle Bar */}
        <div className="flex flex-col items-center pt-3 pb-2 flex-shrink-0">
          <span className="w-10 h-1 rounded-full" style={{ backgroundColor: "#2e3454" }} />
        </div>

        {/* Header Step: Main */}
        {step === "main" ? (
          <div
            className="flex items-center justify-between px-5 pb-3 border-b flex-shrink-0"
            style={{ borderColor: "#1e2240" }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">👁️</span>
              <h3 className="font-extrabold text-base" style={{ color: "#e8eaf2" }}>
                Ai được xem bài đăng này
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              aria-label="Đóng"
            >
              ✕
            </button>
          </div>
        ) : (
          /* Header Step: Picker Sub-page */
          <div
            className="flex items-center justify-between px-4 pb-3 border-b flex-shrink-0"
            style={{ borderColor: "#1e2240" }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setStep("main")}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:bg-[#1a1d30] transition-colors"
                title="Quay lại"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm truncate" style={{ color: "#e8eaf2" }}>
                  {selectedType === "custom_include"
                    ? "Chọn bạn bè được xem"
                    : "Chọn bạn bè không được xem"}
                </h3>
                <p className="text-[11px]" style={{ color: "#8a94b8" }}>
                  {selectedType === "custom_include"
                    ? "Chỉ những người này mới thấy bài đăng"
                    : "Những người này sẽ không thấy bài đăng"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || success}
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-white transition-all shadow-md bg-[#6c63ff] hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              {saving ? "Lưu..." : `Xong (${activeSelectedFriends.length})`}
            </button>
          </div>
        )}

        {error && (
          <div
            className="mx-5 mt-3 p-3 rounded-xl text-xs flex items-center gap-2 flex-shrink-0"
            style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#f87171" }}
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            className="mx-5 mt-3 p-3 rounded-xl text-xs flex items-center gap-2 flex-shrink-0"
            style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#4ade80" }}
          >
            <span>✓</span>
            <span>Đã cập nhật quyền xem bài đăng!</span>
          </div>
        )}

        {/* STEP 1: Main 4 options */}
        {step === "main" ? (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
              {options.map((opt) => {
                const active = selectedType === opt.type;
                const customCount =
                  opt.type === "custom_include"
                    ? includeFriends.length
                    : opt.type === "custom_exclude"
                      ? excludeFriends.length
                      : 0;

                return (
                  <div
                    key={opt.type}
                    onClick={() => handleSelectOption(opt.type)}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl transition-all text-left cursor-pointer select-none"
                    style={{
                      backgroundColor: active ? "rgba(108,99,255,0.18)" : "#0c0e18",
                      border: `1px solid ${active ? "#6c63ff" : "#1a1d30"}`,
                    }}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{
                          backgroundColor: active ? "#6c63ff" : "#1a1d30",
                        }}
                      >
                        {opt.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className="font-bold text-sm leading-tight"
                            style={{ color: active ? "#ffffff" : "#e8eaf2" }}
                          >
                            {opt.label}
                          </p>
                          {customCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#6c63ff] text-white">
                              {customCount} người
                            </span>
                          )}
                        </div>
                        <p
                          className="text-xs leading-normal mt-0.5"
                          style={{ color: active ? "#c7d2fe" : "#6b74a0" }}
                        >
                          ({opt.subLabel})
                        </p>
                        {opt.type === "friends" && active && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onClose();
                              router.push("/profile/privacy");
                            }}
                            className="mt-1 text-[11px] font-semibold text-[#818cf8] hover:underline flex items-center gap-1"
                          >
                            ⚙️ Xem cài đặt chặn xem nhật ký →
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {opt.hasSubPage && (
                        <span className="text-slate-400 text-sm">›</span>
                      )}

                      {/* Radio indicator */}
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                        style={{
                          border: `2px solid ${active ? "#6c63ff" : "#3a4060"}`,
                          backgroundColor: active ? "#6c63ff" : "transparent",
                        }}
                      >
                        {active && (
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#fff"
                            strokeWidth={3.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Main Action Footer */}
            <div
              className="p-4 border-t flex items-center gap-3 flex-shrink-0"
              style={{ borderColor: "#1e2240", backgroundColor: "#0c0e18" }}
            >
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl text-xs font-bold transition-all text-slate-300 hover:bg-[#1a1d30]"
                style={{ border: "1px solid #1e2240" }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || success}
                className="flex-1 py-3 rounded-2xl text-xs font-bold text-white transition-all shadow-lg hover:opacity-90 active:scale-98 disabled:opacity-50"
                style={{
                  backgroundColor: "#6c63ff",
                  boxShadow: "0 4px 15px rgba(108,99,255,0.35)",
                }}
              >
                {saving ? "Đang lưu..." : success ? "Đã lưu ✓" : "Lưu thay đổi"}
              </button>
            </div>
          </>
        ) : (
          /* STEP 2: Dedicated Friend Selection Sub-page */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search Bar & Helper tools */}
            <div className="px-4 py-3 border-b space-y-2 flex-shrink-0" style={{ borderColor: "#1e2240" }}>
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                style={{ backgroundColor: "#161929", border: "1px solid #1e2240" }}
              >
                <span className="text-slate-400">🔍</span>
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm bạn bè trong danh bạ..."
                  className="w-full bg-transparent outline-none text-xs"
                  style={{ color: "#e8eaf2" }}
                />
                {search && (
                  <button type="button" onClick={() => setSearch("")} className="text-slate-400 text-xs">
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-xs px-1">
                <span className="font-semibold" style={{ color: "#8a94b8" }}>
                  Đã chọn:{" "}
                  <strong className="text-[#6c63ff] font-extrabold">
                    {activeSelectedFriends.length}
                  </strong>{" "}
                  / {matches.length} bạn bè
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[#6c63ff] font-bold hover:underline"
                  >
                    Chọn tất cả
                  </button>
                  <span style={{ color: "#3a4060" }}>·</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-slate-400 font-semibold hover:underline"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>
            </div>

            {/* Friend List */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
              {filteredMatches.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-2xl mb-2">👤</p>
                  <p className="text-xs font-semibold" style={{ color: "#6b74a0" }}>
                    {matches.length === 0
                      ? "Bạn chưa có bạn bè nào trong danh bạ"
                      : "Không tìm thấy bạn bè phù hợp"}
                  </p>
                </div>
              ) : (
                filteredMatches.map((friend) => {
                  const isChecked = activeSelectedFriends.includes(friend.userId);
                  return (
                    <div
                      key={friend.userId}
                      onClick={() => toggleFriend(friend.userId)}
                      className="w-full flex items-center justify-between p-2.5 rounded-2xl transition-all text-left hover:bg-[#1a1d30] cursor-pointer select-none"
                      style={{
                        backgroundColor: isChecked ? "rgba(108,99,255,0.12)" : "transparent",
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          initials={initialsFromName(friend.displayName)}
                          userId={friend.userId}
                          photoUrl={friend.primaryPhoto}
                          online={friend.online}
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "#e8eaf2" }}>
                            {friend.displayName}
                          </p>
                          {friend.lastMessage && (
                            <p className="text-[11px] truncate" style={{ color: "#6b74a0" }}>
                              {friend.lastMessage}
                            </p>
                          )}
                        </div>
                      </div>

                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ml-3"
                        style={{
                          border: isChecked ? "2px solid #6c63ff" : "2px solid #3a4060",
                          backgroundColor: isChecked ? "#6c63ff" : "transparent",
                        }}
                      >
                        {isChecked && (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#fff"
                            strokeWidth={3}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sub-page Footer */}
            <div
              className="p-4 border-t flex items-center gap-3 flex-shrink-0"
              style={{ borderColor: "#1e2240", backgroundColor: "#0c0e18" }}
            >
              <button
                type="button"
                onClick={() => setStep("main")}
                className="flex-1 py-3 rounded-2xl text-xs font-bold transition-all text-slate-300 hover:bg-[#1a1d30]"
                style={{ border: "1px solid #1e2240" }}
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || success}
                className="flex-1 py-3 rounded-2xl text-xs font-bold text-white transition-all shadow-lg hover:opacity-90 active:scale-98 disabled:opacity-50"
                style={{
                  backgroundColor: "#6c63ff",
                  boxShadow: "0 4px 15px rgba(108,99,255,0.35)",
                }}
              >
                {saving ? "Đang lưu..." : success ? "Đã lưu ✓" : `Xác nhận (${activeSelectedFriends.length})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

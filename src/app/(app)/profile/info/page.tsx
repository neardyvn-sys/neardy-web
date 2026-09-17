"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers/AppProvider";
import { meApi } from "@/lib/api";

const GENDER_OPTIONS = [
  { id: "woman", label: "Nữ 👩" },
  { id: "man", label: "Nam 👨" },
  { id: "nonbinary", label: "Khác 🌈" },
] as const;

function calculateAgeFromBirthDate(birthDateStr: string): number | null {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

export default function PersonalInfoPage() {
  const { user } = useApp();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<string>("woman");
  const [lookingFor, setLookingFor] = useState<string[]>(["woman", "man", "nonbinary"]);
  const [bio, setBio] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const profile = await meApi.get();
        if (cancelled) return;
        setDisplayName(profile.display_name || "");
        setBirthDate(profile.birth_date || "1998-01-01");
        setGender(profile.gender || "woman");
        setLookingFor(
          profile.looking_for && profile.looking_for.length > 0
            ? profile.looking_for
            : ["woman", "man", "nonbinary"],
        );
        setBio(profile.bio || "");
      } catch (e) {
        if (!cancelled) {
          setMessage({
            type: "error",
            text: e instanceof Error ? e.message : "Không thể tải thông tin cá nhân",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) return null;

  const toggleLookingFor = (item: string) => {
    setLookingFor((prev) => {
      if (prev.includes(item)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((g) => g !== item);
      }
      return [...prev, item];
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setMessage({ type: "error", text: "Tên hiển thị không được để trống" });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await meApi.patch({
        display_name: displayName.trim(),
        birth_date: birthDate,
        gender,
        looking_for: lookingFor,
        bio: bio.trim(),
      });
      setMessage({ type: "success", text: "Đã lưu thông tin cá nhân thành công!" });
      setTimeout(() => {
        router.push("/profile");
      }, 1000);
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Cập nhật thất bại. Vui lòng thử lại",
      });
    } finally {
      setSaving(false);
    }
  };

  const computedAge = calculateAgeFromBirthDate(birthDate);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0c14", color: "#e8eaf2" }}>
      {/* Top Header */}
      <div
        className="flex items-center gap-3 px-4 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid #1e2240", backgroundColor: "#0d0f1a" }}
      >
        <button
          type="button"
          onClick={() => router.push("/profile")}
          className="p-1 rounded-xl"
          style={{ color: "#6b74a0" }}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <span className="font-extrabold text-base" style={{ color: "#e8eaf2" }}>
          Thông tin cá nhân
        </span>
        {saving && (
          <span className="ml-auto text-xs animate-pulse" style={{ color: "#9b94ff" }}>
            Đang lưu…
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 max-w-md mx-auto w-full space-y-5">
        {message && (
          <div
            className="p-3.5 rounded-2xl text-xs font-semibold slide-up"
            style={{
              backgroundColor: message.type === "success" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
              color: message.type === "success" ? "#10b981" : "#f87171",
              border: message.type === "success" ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(239,68,68,0.25)",
            }}
          >
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="skeleton h-16 rounded-2xl" />
            <div className="skeleton h-16 rounded-2xl" />
            <div className="skeleton h-24 rounded-2xl" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            {/* Tên hiển thị */}
            <div className="p-4 rounded-2xl space-y-2" style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}>
              <label className="block text-xs font-bold" style={{ color: "#a0a8c8" }}>
                TÊN HIỂN THỊ
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nhập tên hiển thị..."
                className="w-full bg-transparent border-b outline-none py-2 text-sm font-semibold transition-colors"
                style={{ borderColor: "#1e2240", color: "#e8eaf2" }}
                required
              />
              <p className="text-[11px]" style={{ color: "#6b74a0" }}>
                Tên này sẽ hiển thị với bạn bè và những người xung quanh trên Neardy.
              </p>
            </div>

            {/* Ngày sinh */}
            <div className="p-4 rounded-2xl space-y-2" style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}>
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold" style={{ color: "#a0a8c8" }}>
                  NGÀY SINH
                </label>
                {computedAge !== null && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ backgroundColor: "rgba(108,99,255,0.15)", color: "#9b94ff" }}>
                    {computedAge} tuổi
                  </span>
                )}
              </div>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-transparent border-b outline-none py-2 text-sm font-semibold transition-colors"
                style={{ borderColor: "#1e2240", color: "#e8eaf2" }}
                required
              />
            </div>

            {/* Giới tính */}
            <div className="p-4 rounded-2xl space-y-3" style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}>
              <label className="block text-xs font-bold" style={{ color: "#a0a8c8" }}>
                GIỚI TÍNH CỦA BẠN
              </label>
              <div className="grid grid-cols-3 gap-2">
                {GENDER_OPTIONS.map((opt) => {
                  const selected = gender === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setGender(opt.id)}
                      className="py-2.5 rounded-xl text-xs font-bold transition-all"
                      style={
                        selected
                          ? {
                              background: "linear-gradient(135deg, #6c63ff, #5b54e8)",
                              color: "#fff",
                              boxShadow: "0 4px 12px rgba(108,99,255,0.3)",
                            }
                          : { backgroundColor: "#1a1d2e", color: "#6b74a0" }
                      }
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sở thích / Tìm kiếm */}
            <div className="p-4 rounded-2xl space-y-3" style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}>
              <label className="block text-xs font-bold" style={{ color: "#a0a8c8" }}>
                SỞ THÍCH / ĐỐI TƯỢNG MUỐN KẾT BẠN
              </label>
              <div className="grid grid-cols-3 gap-2">
                {GENDER_OPTIONS.map((opt) => {
                  const selected = lookingFor.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleLookingFor(opt.id)}
                      className="py-2.5 rounded-xl text-xs font-bold transition-all"
                      style={
                        selected
                          ? {
                              backgroundColor: "rgba(0,229,255,0.15)",
                              color: "#00e5ff",
                              border: "1px solid rgba(0,229,255,0.3)",
                            }
                          : { backgroundColor: "#1a1d2e", color: "#6b74a0", border: "1px solid transparent" }
                      }
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px]" style={{ color: "#6b74a0" }}>
                Chọn một hoặc nhiều giới tính bạn muốn tìm kiếm trên bản đồ Gần đây.
              </p>
            </div>

            {/* Tiểu sử */}
            <div className="p-4 rounded-2xl space-y-2" style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}>
              <label className="block text-xs font-bold" style={{ color: "#a0a8c8" }}>
                TIỂU SỬ / GIỚI THIỆU
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Viết đôi dòng giới thiệu bản thân..."
                rows={3}
                className="w-full bg-transparent border rounded-xl p-3 text-sm outline-none resize-none transition-colors"
                style={{ borderColor: "#1e2240", color: "#e8eaf2", backgroundColor: "#0d0f1a" }}
              />
            </div>

            {/* Nút lưu */}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 rounded-2xl text-sm font-bold transition-all"
              style={{
                background: "linear-gradient(135deg, #6c63ff, #5b54e8)",
                color: "#fff",
                boxShadow: "0 4px 20px rgba(108,99,255,0.4)",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Đang lưu thay đổi..." : "Lưu thay đổi"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

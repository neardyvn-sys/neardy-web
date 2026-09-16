"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers/AppProvider";

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

function browserStatusLabel(state: string) {
  if (state === "granted") return { text: "Đã cho phép", color: "#00e5ff" };
  if (state === "denied") return { text: "Đã từ chối", color: "#f87171" };
  if (state === "loading") return { text: "Đang kiểm tra…", color: "#6b74a0" };
  return { text: "Chưa xin quyền", color: "#6b74a0" };
}

export default function LocationSettingsPage() {
  const {
    user,
    permissionState,
    locationSharing,
    setLocationSharing,
    requestLocation,
    locationBusy,
  } = useApp();
  const router = useRouter();

  if (!user) return null;

  const browser = browserStatusLabel(permissionState);

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
          Quyền vị trí
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-md mx-auto w-full">
        <div
          className="rounded-2xl px-4 py-4"
          style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
        >
          <p className="text-xs font-bold mb-2" style={{ color: "#6b74a0" }}>
            TRÌNH DUYỆT
          </p>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: "#e8eaf2" }}>
                Quyền định vị
              </p>
              <p className="text-xs mt-0.5" style={{ color: browser.color }}>
                {browser.text}
              </p>
            </div>
            <span className="text-2xl">📍</span>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2240" }}>
          <div className="flex items-center gap-3 px-4 py-4" style={{ backgroundColor: "#111320" }}>
            <span className="text-lg w-7 text-center">🛰️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: "#e8eaf2" }}>
                Chia sẻ vị trí với Nearby
              </p>
              <p className="text-xs" style={{ color: "#6b74a0" }}>
                Dùng GPS để hiện người quanh bạn
              </p>
            </div>
            <Toggle
              on={locationSharing}
              disabled={locationBusy}
              onChange={(v) => void setLocationSharing(v)}
            />
          </div>
        </div>

        {!locationSharing ? (
          <p
            className="text-xs rounded-xl px-3 py-2.5"
            style={{ backgroundColor: "rgba(108,99,255,0.1)", color: "#9b94ff" }}
          >
            Đã tắt chia sẻ. Nearby dùng vị trí mặc định (không phải GPS thật của bạn).
          </p>
        ) : null}

        {locationSharing && permissionState === "denied" ? (
          <p
            className="text-xs rounded-xl px-3 py-2.5"
            style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#f87171" }}
          >
            Trình duyệt đang chặn vị trí. Mở cài đặt trang này → Quyền → Vị trí → Cho phép, rồi nhấn cập
            nhật bên dưới.
          </p>
        ) : null}

        {locationSharing && permissionState === "granted" ? (
          <p
            className="text-xs rounded-xl px-3 py-2.5"
            style={{ backgroundColor: "rgba(0,229,255,0.08)", color: "#00e5ff" }}
          >
            Đang dùng GPS thật để tìm người gần bạn.
          </p>
        ) : null}

        <button
          type="button"
          disabled={!locationSharing || locationBusy}
          onClick={() => void requestLocation()}
          className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all"
          style={
            locationSharing && !locationBusy
              ? {
                  background: "linear-gradient(135deg, #6c63ff, #5b54e8)",
                  color: "#fff",
                  boxShadow: "0 4px 16px rgba(108,99,255,0.3)",
                }
              : { backgroundColor: "#1a1d2e", color: "#3a4060" }
          }
        >
          {locationBusy ? "Đang cập nhật…" : "Cập nhật vị trí ngay"}
        </button>

        <p className="text-xs px-1 leading-relaxed" style={{ color: "#3a4060" }}>
          Web không thể tắt quyền GPS trong trình duyệt giúp bạn — chỉ có thể dừng chia sẻ trong Neardy
          hoặc đổi quyền trong cài đặt trình duyệt/OS.
        </p>
      </div>
    </div>
  );
}

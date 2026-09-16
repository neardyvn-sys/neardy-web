"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers/AppProvider";
import {
  DEFAULT_NOTIFICATION_PREFS,
  loadNotificationPrefs,
  saveNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/notificationPrefs";

const GROUPS: {
  key: keyof Omit<NotificationPrefs, "all">;
  icon: string;
  label: string;
  sub: string;
}[] = [
  {
    key: "messages",
    icon: "💬",
    label: "Tin nhắn",
    sub: "Tin nhắn mới từ bạn bè",
  },
  {
    key: "connections",
    icon: "💜",
    label: "Kết nối",
    sub: "Like, match và lời mời kết bạn",
  },
  {
    key: "diary",
    icon: "📓",
    label: "Nhật ký",
    sub: "Like và bình luận trên bài của bạn",
  },
  {
    key: "nearby",
    icon: "📍",
    label: "Gần đây",
    sub: "Người gần bạn và lượt ghé thăm tường",
  },
];

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

export default function NotificationsPage() {
  const { user } = useApp();
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [hint, setHint] = useState("");

  useEffect(() => {
    setPrefs(loadNotificationPrefs());
    if (typeof Notification === "undefined") {
      setPermission("unsupported");
    } else {
      setPermission(Notification.permission);
    }
  }, []);

  if (!user) return null;

  const persist = (next: NotificationPrefs) => {
    setPrefs(next);
    saveNotificationPrefs(next);
  };

  const requestBrowserPermission = async () => {
    if (typeof Notification === "undefined") {
      setPermission("unsupported");
      setHint("Trình duyệt này không hỗ trợ thông báo hệ thống.");
      return false;
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        setHint("Bạn đã tắt quyền thông báo trên trình duyệt. Bật lại trong cài đặt trình duyệt.");
        return false;
      }
      setHint("");
      return true;
    } catch {
      setHint("Không xin được quyền thông báo.");
      return false;
    }
  };

  const setAll = async (on: boolean) => {
    if (on) {
      const ok = await requestBrowserPermission();
      if (!ok && permission !== "granted") {
        // still save preference intent; delivery needs OS permission
      }
    }
    persist({
      all: on,
      messages: on,
      connections: on,
      diary: on,
      nearby: on,
    });
  };

  const setGroup = async (key: keyof Omit<NotificationPrefs, "all">, on: boolean) => {
    if (on && !prefs.all) {
      const ok = await requestBrowserPermission();
      if (!ok && typeof Notification !== "undefined" && Notification.permission !== "granted") {
        // keep going — preference stored locally
      }
    }
    const next: NotificationPrefs = {
      ...prefs,
      [key]: on,
      all: on ? true : prefs.all,
    };
    if (!on) {
      const anyOn = (["messages", "connections", "diary", "nearby"] as const).some(
        (k) => (k === key ? false : next[k]),
      );
      if (!anyOn) next.all = false;
    }
    persist(next);
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
          Thông báo
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-md mx-auto w-full">
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2240" }}>
          <div
            className="flex items-center gap-3 px-4 py-4"
            style={{ backgroundColor: "#111320" }}
          >
            <span className="text-lg w-7 text-center">🔔</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: "#e8eaf2" }}>
                Bật tất cả
              </p>
              <p className="text-xs" style={{ color: "#6b74a0" }}>
                Nhận thông báo từ Neardy
              </p>
            </div>
            <Toggle on={prefs.all} onChange={(v) => void setAll(v)} />
          </div>
        </div>

        {permission === "denied" || hint ? (
          <p
            className="text-xs rounded-xl px-3 py-2.5"
            style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#f87171" }}
          >
            {hint ||
              "Quyền thông báo trình duyệt đang tắt. Mở cài đặt trình duyệt để bật lại."}
          </p>
        ) : null}

        {permission === "granted" ? (
          <p
            className="text-xs rounded-xl px-3 py-2.5"
            style={{ backgroundColor: "rgba(0,229,255,0.08)", color: "#00e5ff" }}
          >
            Đã cho phép thông báo trên trình duyệt này.
          </p>
        ) : null}

        <p className="text-xs font-bold px-1 mb-1 mt-2" style={{ color: "#6b74a0" }}>
          LOẠI THÔNG BÁO
        </p>
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2240" }}>
          {GROUPS.map((item, i) => {
            const on = prefs.all && prefs[item.key];
            return (
              <div
                key={item.key}
                className="flex items-center gap-3 px-4 py-4"
                style={{
                  backgroundColor: "#111320",
                  borderBottom: i < GROUPS.length - 1 ? "1px solid #1e2240" : "none",
                  opacity: prefs.all ? 1 : 0.55,
                }}
              >
                <span className="text-lg w-7 text-center">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "#e8eaf2" }}>
                    {item.label}
                  </p>
                  <p className="text-xs" style={{ color: "#6b74a0" }}>
                    {item.sub}
                  </p>
                </div>
                <Toggle
                  on={on}
                  disabled={!prefs.all}
                  onChange={(v) => void setGroup(item.key, v)}
                />
              </div>
            );
          })}
        </div>

        <p className="text-xs px-1 leading-relaxed" style={{ color: "#3a4060" }}>
          Cài đặt được lưu trên thiết bị này. Push server sẽ dùng các tùy chọn này khi gửi thông báo.
        </p>
      </div>
    </div>
  );
}

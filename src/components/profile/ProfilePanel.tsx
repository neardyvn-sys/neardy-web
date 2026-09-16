"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers/AppProvider";
import { feedApi, meApi } from "@/lib/api";
import {
  loadNotificationPrefs,
  notificationPrefsSummary,
} from "@/lib/notificationPrefs";
import { locationSharingSummary } from "@/lib/locationPrefs";
import { privacySummary } from "@/lib/privacy";

const SETTINGS = [
  {
    icon: "🛡️",
    label: "Tài khoản & Bảo mật",
    sub: "Email, mật khẩu, mã QR",
    href: "/profile/security",
  },
  {
    icon: "🔔",
    label: "Thông báo",
    sub: "Bật tất cả",
    href: "/profile/notifications",
  },
  {
    icon: "📍",
    label: "Quyền vị trí",
    sub: "Luôn bật",
    href: "/profile/location",
  },
  {
    icon: "🔒",
    label: "Quyền riêng tư",
    sub: "Công khai",
    href: "/profile/privacy",
  },
  { icon: "🎨", label: "Giao diện", sub: "Tối" },
] as const;

export default function ProfilePanel() {
  const { user, friends, logout, permissionState, locationSharing } = useApp();
  const router = useRouter();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [postCount, setPostCount] = useState(0);
  const [notifSub, setNotifSub] = useState("Bật tất cả");
  const [privacySub, setPrivacySub] = useState("Công khai");

  useEffect(() => {
    setNotifSub(notificationPrefsSummary(loadNotificationPrefs()));
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const [profile, feed] = await Promise.all([
          meApi.get(),
          feedApi.list({ userId: user.id, limit: 100 }),
        ]);
        if (cancelled) return;
        const primary =
          profile.photos.find((p) => p.is_primary)?.url || profile.photos[0]?.url || null;
        setPhotoUrl(primary);
        setPostCount(feed.posts.length);
        if (profile.privacy) setPrivacySub(privacySummary(profile.privacy));
      } catch {
        // keep defaults
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  const locationSub = locationSharingSummary(locationSharing, permissionState);

  const settings = SETTINGS.map((item) => {
    if (item.label === "Quyền vị trí") return { ...item, sub: locationSub };
    if (item.label === "Thông báo") return { ...item, sub: notifSub };
    if (item.label === "Quyền riêng tư") return { ...item, sub: privacySub };
    return item;
  });

  return (
    <div className="px-4 pb-8">
      {/* Clickable profile card → My Wall */}
      <button
        type="button"
        onClick={() => router.push("/wall/me")}
        className="w-full text-left mb-5 rounded-2xl card-hover relative"
        style={{ border: "1px solid #1e2240", backgroundColor: "#111320" }}
      >
        <div
          className="h-20 rounded-t-2xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #2d1b69, #0f1a3d)" }}
        >
          <div
            className="w-full h-full opacity-20"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(108,99,255,0.4) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
        </div>
        <div className="px-4 pt-3 pb-4 flex items-center gap-4">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt=""
              className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
              style={{ border: "3px solid #111320" }}
            />
          ) : (
            <div
              className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-lg font-extrabold text-white flex-shrink-0"
              style={{ border: "3px solid #111320" }}
            >
              {user.avatar}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-base truncate" style={{ color: "#e8eaf2" }}>
              {user.name}
            </p>
            <p className="text-xs truncate" style={{ color: "#6b74a0" }}>
              {user.email}
            </p>
            <span
              className="text-xs mt-0.5 px-2 py-0.5 rounded-full inline-block"
              style={{ backgroundColor: "rgba(0,229,255,0.1)", color: "#00e5ff" }}
            >
              🟢 Đang online
            </span>
          </div>
          <span
            className="flex-shrink-0 text-xs px-2 py-1 rounded-lg font-semibold"
            style={{ backgroundColor: "rgba(108,99,255,0.2)", color: "#9b94ff" }}
          >
            Xem tường →
          </span>
        </div>
      </button>

      <div
        className="grid grid-cols-3 gap-px rounded-2xl overflow-hidden mb-5"
        style={{ backgroundColor: "#1e2240" }}
      >
        {[
          { label: "Bạn bè", value: friends.size },
          { label: "Bài viết", value: postCount },
          { label: "Lượt ghé thăm", value: 128 },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center py-3.5" style={{ backgroundColor: "#111320" }}>
            <span className="text-base font-extrabold" style={{ color: "#e8eaf2" }}>
              {s.value}
            </span>
            <span className="text-xs" style={{ color: "#6b74a0" }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden mb-3" style={{ border: "1px solid #1e2240" }}>
        {settings.map((item, i, arr) => (
          <button
            key={item.label}
            type="button"
            onClick={"href" in item && item.href ? () => router.push(item.href) : undefined}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
            style={{
              backgroundColor: "#111320",
              borderBottom: i < arr.length - 1 ? "1px solid #1e2240" : "none",
            }}
          >
            <span className="text-base">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: "#e8eaf2" }}>
                {item.label}
              </p>
              <p className="text-xs truncate" style={{ color: "#6b74a0" }}>
                {item.sub}
              </p>
            </div>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#3a4060" strokeWidth={2}>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void logout()}
        className="w-full py-3.5 rounded-2xl text-sm font-bold"
        style={{
          backgroundColor: "rgba(239,68,68,0.1)",
          color: "#f87171",
          border: "1px solid rgba(239,68,68,0.15)",
        }}
      >
        Đăng xuất
      </button>
    </div>
  );
}

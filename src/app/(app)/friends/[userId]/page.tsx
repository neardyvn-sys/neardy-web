"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import { useApp } from "@/components/providers/AppProvider";
import { friendRequestsApi, usersApi } from "@/lib/api";
import { initialsFromName } from "@/lib/types";

export default function FriendRequestPage() {
  const params = useParams();
  const userId = String(params.userId);
  const router = useRouter();
  const { user, users, matches, friends, refreshMatches } = useApp();

  const nearby = users.find((u) => u.id === userId);
  const match = matches.find((m) => m.userId === userId);

  const [name, setName] = useState(nearby?.name || match?.displayName || "");
  const [photo, setPhoto] = useState<string | null>(nearby?.photoUrl || match?.primaryPhoto || null);
  const [message, setMessage] = useState("");
  const [hideActivity, setHideActivity] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sentOk, setSentOk] = useState(false);

  useEffect(() => {
    if (!user) return;
    setMessage(`Xin chào, mình là ${user.name}. Kết bạn với mình nhé`);
  }, [user]);

  useEffect(() => {
    if (nearby || match) return;
    let cancelled = false;
    usersApi
      .get(userId)
      .then((p) => {
        if (cancelled) return;
        setName(p.display_name);
        setPhoto(p.photos.find((x) => x.is_primary)?.url || p.photos[0]?.url || null);
      })
      .catch(() => {
        if (!cancelled) setName("Người dùng");
      });
    return () => {
      cancelled = true;
    };
  }, [userId, nearby, match]);

  const avatar = useMemo(() => initialsFromName(name || "?"), [name]);

  if (!user) return null;

  if (friends.has(userId)) {
    return (
      <div className="min-h-screen px-4 py-8 max-w-md mx-auto" style={{ backgroundColor: "#0a0c14", color: "#e8eaf2" }}>
        <p className="text-sm mb-4" style={{ color: "#6b74a0" }}>
          Bạn đã kết nối với {name || "người này"}.
        </p>
        <button
          onClick={() => router.push(`/messages/${userId}`)}
          className="w-full py-3 rounded-2xl text-sm font-bold"
          style={{ background: "linear-gradient(135deg, #6c63ff, #5b54e8)", color: "#fff" }}
        >
          Nhắn tin
        </button>
      </div>
    );
  }

  const submit = async () => {
    if (sending) return;
    setSending(true);
    setError("");
    try {
      const res = await friendRequestsApi.create({
        user_id: userId,
        message: message.trim(),
        hide_activity: hideActivity,
      });
      if (res.auto_accepted && res.conversation_id) {
        await refreshMatches();
        router.replace(`/messages/${userId}`);
        return;
      }
      setSentOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gửi yêu cầu thất bại");
    } finally {
      setSending(false);
    }
  };

  if (sentOk) {
    return (
      <div className="min-h-screen px-5 py-10 max-w-md mx-auto flex flex-col items-center text-center" style={{ backgroundColor: "#0a0c14", color: "#e8eaf2" }}>
        <div className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center" style={{ backgroundColor: "rgba(108,99,255,0.15)" }}>
          <span className="text-2xl">✉️</span>
        </div>
        <h2 className="text-lg font-extrabold mb-2">Đã gửi lời mời</h2>
        <p className="text-sm mb-8" style={{ color: "#6b74a0" }}>
          Đợi {name || "họ"} chấp nhận. Bạn có thể xem lại trong Danh bạ → Lời mời kết bạn → Đã gửi.
        </p>
        <button
          onClick={() => router.push("/contacts")}
          className="w-full py-3 rounded-2xl text-sm font-bold mb-3"
          style={{ background: "linear-gradient(135deg, #6c63ff, #5b54e8)", color: "#fff" }}
        >
          Xem lời mời đã gửi
        </button>
        <button onClick={() => router.push("/nearby")} className="text-sm" style={{ color: "#6b74a0" }}>
          Về Gần đây
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0c14", color: "#e8eaf2" }}>
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid #1e2240", backgroundColor: "#0d0f1a" }}
      >
        <button onClick={() => router.back()} className="p-1.5 rounded-xl" style={{ color: "#6b74a0" }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <p className="text-sm font-bold">Kết bạn</p>
      </div>

      <div className="flex-1 px-5 py-8 max-w-md mx-auto w-full">
        <div className="flex flex-col items-center text-center mb-8">
          <Avatar initials={avatar} userId={userId} size="xl" photoUrl={photo} online />
          <h1 className="mt-4 text-xl font-extrabold">{name || "…"}</h1>
          <p className="text-xs mt-1" style={{ color: "#6b74a0" }}>
            Gửi lời mời kết bạn
          </p>
        </div>

        <label className="block text-xs font-semibold mb-2" style={{ color: "#a0a8c8" }}>
          Lời kết bạn
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={200}
          className="w-full rounded-2xl px-4 py-3 text-sm outline-none resize-none mb-2"
          style={{
            backgroundColor: "#111320",
            border: "1px solid #1e2240",
            color: "#e8eaf2",
          }}
        />
        <p className="text-xs mb-6 text-right" style={{ color: "#3a4060" }}>
          {message.length}/200
        </p>

        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5 mb-8"
          style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Chặn người này xem hoạt động của tôi</p>
            <p className="text-xs mt-0.5" style={{ color: "#6b74a0" }}>
              Họ sẽ không thấy nhật ký / trạng thái của bạn
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={hideActivity}
            onClick={() => setHideActivity((v) => !v)}
            className="relative w-12 h-7 rounded-full flex-shrink-0 transition-colors"
            style={{ backgroundColor: hideActivity ? "#6c63ff" : "#1a1d2e" }}
          >
            <span
              className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
              style={{ left: hideActivity ? "26px" : "4px" }}
            />
          </button>
        </div>

        {error && (
          <p className="text-xs mb-4 rounded-xl px-3 py-2" style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#f87171" }}>
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={sending || !message.trim()}
          onClick={() => void submit()}
          className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all"
          style={
            sending || !message.trim()
              ? { backgroundColor: "#1a1d2e", color: "#3a4060" }
              : {
                  background: "linear-gradient(135deg, #6c63ff, #5b54e8)",
                  color: "#fff",
                  boxShadow: "0 8px 24px rgba(108,99,255,0.35)",
                }
          }
        >
          {sending ? "Đang gửi…" : "Gửi yêu cầu"}
        </button>
      </div>
    </div>
  );
}

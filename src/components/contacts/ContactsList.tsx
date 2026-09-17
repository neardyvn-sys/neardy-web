"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import { useApp } from "@/components/providers/AppProvider";
import { friendRequestsApi, type FriendRequestItem } from "@/lib/api";
import { initialsFromName } from "@/lib/types";

type InviteTab = "received" | "sent";

export default function ContactsList() {
  const { matches, friends, refreshMatches } = useApp();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(true);
  const [inviteTab, setInviteTab] = useState<InviteTab>("received");
  const [received, setReceived] = useState<FriendRequestItem[]>([]);
  const [sent, setSent] = useState<FriendRequestItem[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    setLoadingInvites(true);
    try {
      const data = await friendRequestsApi.list();
      setReceived(data.received || []);
      setSent(data.sent || []);
    } catch {
      setReceived([]);
      setSent([]);
    } finally {
      setLoadingInvites(false);
    }
  }, []);

  useEffect(() => {
    void loadInvites();
  }, [loadInvites]);

  const list = matches.filter(
    (m) => !search || m.displayName.toLowerCase().includes(search.toLowerCase()),
  );

  const inviteList = inviteTab === "received" ? received : sent;

  const accept = async (id: string, userId: string) => {
    setBusyId(id);
    try {
      await friendRequestsApi.accept(id);
      await refreshMatches();
      await loadInvites();
      router.push(`/messages/${userId}`);
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    setBusyId(id);
    try {
      await friendRequestsApi.reject(id);
      await loadInvites();
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (id: string) => {
    setBusyId(id);
    try {
      await friendRequestsApi.cancel(id);
      await loadInvites();
    } finally {
      setBusyId(null);
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
          placeholder="Tìm kiếm danh bạ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent outline-none text-sm w-full"
          style={{ color: "#e8eaf2" }}
        />
      </div>

      {/* Friend invites */}
      <div className="mb-5 rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2240" }}>
        <button
          type="button"
          onClick={() => setInviteOpen((v) => !v)}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
          style={{ backgroundColor: "#111320" }}
        >
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
            style={{ backgroundColor: "rgba(108,99,255,0.15)" }}
          >
            ✉️
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: "#e8eaf2" }}>
              Lời mời kết bạn
            </p>
            <p className="text-xs" style={{ color: "#6b74a0" }}>
              {received.length} nhận · {sent.length} gửi
            </p>
          </div>
          {(received.length > 0 || sent.length > 0) && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ backgroundColor: "#6c63ff", color: "#fff" }}
            >
              {received.length + sent.length}
            </span>
          )}
          <svg
            width="14"
            height="14"
            fill="none"
            viewBox="0 0 24 24"
            stroke="#3a4060"
            strokeWidth={2}
            style={{ transform: inviteOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        {inviteOpen && (
          <div style={{ backgroundColor: "#0d0f1a", borderTop: "1px solid #1e2240" }}>
            <div className="flex gap-1 p-2">
              {(
                [
                  { id: "received" as const, label: "Đã nhận", count: received.length },
                  { id: "sent" as const, label: "Đã gửi", count: sent.length },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setInviteTab(t.id)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={
                    inviteTab === t.id
                      ? { backgroundColor: "#6c63ff", color: "#fff" }
                      : { backgroundColor: "#111320", color: "#6b74a0" }
                  }
                >
                  {t.label} {t.count}
                </button>
              ))}
            </div>

            <div className="px-2 pb-2 space-y-2">
              {loadingInvites ? (
                <div className="space-y-2 p-1">
                  {[1, 2].map((i) => (
                    <div key={i} className="skeleton h-16 rounded-xl" />
                  ))}
                </div>
              ) : inviteList.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs" style={{ color: "#3a4060" }}>
                    {inviteTab === "received" ? "Chưa có lời mời nào" : "Bạn chưa gửi lời mời nào"}
                  </p>
                </div>
              ) : (
                inviteList.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 px-3 py-3 rounded-xl"
                    style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
                  >
                    <button
                      type="button"
                      onClick={() => router.push(`/wall/${item.user_id}`)}
                      className="flex-shrink-0"
                    >
                      <Avatar
                        initials={initialsFromName(item.display_name)}
                        userId={item.user_id}
                        size="md"
                        photoUrl={item.primary_photo}
                      />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: "#e8eaf2" }}>
                        {item.display_name}
                      </p>
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "#6b74a0" }}>
                        {item.message || "Muốn kết bạn với bạn"}
                      </p>
                      {inviteTab === "received" ? (
                        <div className="flex gap-2 mt-2">
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => void accept(item.id, item.user_id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold"
                            style={{ background: "linear-gradient(135deg, #6c63ff, #5b54e8)", color: "#fff" }}
                          >
                            {busyId === item.id ? "…" : "Đồng ý"}
                          </button>
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => void reject(item.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                            style={{ backgroundColor: "#1a1d2e", color: "#6b74a0" }}
                          >
                            Từ chối
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: "#1a1d2e", color: "#9b94ff" }}>
                            Đang chờ
                          </span>
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => void cancel(item.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                            style={{ backgroundColor: "#1a1d2e", color: "#6b74a0" }}
                          >
                            Thu hồi
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs mb-3 px-1" style={{ color: "#6b74a0" }}>
        Bạn bè ({friends.size})
      </p>
      <div className="space-y-2">
        {list.map((m) => (
          <div
            key={m.userId}
            className="flex items-center gap-3 px-3 py-3 rounded-2xl"
            style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
          >
            <button onClick={() => router.push(`/wall/${m.userId}`)} className="relative flex-shrink-0">
              <Avatar
                initials={initialsFromName(m.displayName)}
                userId={m.userId}
                size="md"
                photoUrl={m.primaryPhoto}
                online={m.online}
              />
            </button>
            <div className="flex-1 min-w-0">
              <button
                onClick={() => router.push(`/wall/${m.userId}`)}
                className="font-bold text-sm hover:underline text-left"
                style={{ color: "#e8eaf2" }}
              >
                {m.displayName}
              </button>
              <p className="text-xs truncate" style={{ color: "#6b74a0" }}>
                Đã kết nối
              </p>
            </div>
            <button
              onClick={() => router.push(`/messages/${m.userId}`)}
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(0,229,255,0.1)", color: "#00e5ff" }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          </div>
        ))}
        {list.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-sm font-semibold" style={{ color: "#6b74a0" }}>
              Chưa có bạn bè nào
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

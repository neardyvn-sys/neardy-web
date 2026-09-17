"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import { useCall } from "@/components/call/CallProvider";
import { useApp } from "@/components/providers/AppProvider";
import { likesApi, uploadsApi } from "@/lib/api";
import type { CallLogData, ChatMessage, ChatMsgType, NearbyUser } from "@/lib/types";

const EMOJIS = [
  "😀", "😂", "🥰", "😍", "😎", "🤔", "🙌", "👏", "🔥", "💯",
  "❤️", "💙", "💜", "✨", "🎉", "👋", "👍", "🙏", "😅", "😢",
  "😤", "😴", "🤗", "😘", "🥳", "💪", "🌟", "☕", "🍜", "📍",
];

function formatTime(iso?: string) {
  return new Date(iso || Date.now()).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapServerMessage(
  m: {
    id: string;
    sender_id: string;
    type: string;
    body: string | null;
    media_url?: string | null;
    created_at: string;
    deleted_at?: string | null;
    recalled?: boolean;
  },
  myId: string,
): ChatMessage {
  const recalled = !!(m.recalled || m.deleted_at);
  return {
    id: m.id,
    from: m.sender_id === myId ? "me" : "them",
    text: recalled ? "" : m.body || "",
    msgType: (m.type as ChatMsgType) || "text",
    mediaUrl: recalled ? null : m.media_url,
    time: formatTime(m.created_at),
    createdAt: m.created_at,
    recalled,
  };
}

function parseCallLogData(text: string): CallLogData | null {
  try {
    if (text.startsWith("{")) {
      return JSON.parse(text) as CallLogData;
    }
  } catch {
    // ignore
  }
  return null;
}

function formatCallSecs(seconds?: number) {
  if (!seconds || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function CallLogBubble({
  msg,
  onCallBack,
}: {
  msg: ChatMessage;
  onCallBack?: (callType: "audio" | "video") => void;
}) {
  const isMe = msg.from === "me";
  const data = parseCallLogData(msg.text);
  const callType = data?.call_type || "audio";
  const status = data?.status || "ended";
  const durationSec = data?.duration_seconds;
  const isVideo = callType === "video";

  let title = isVideo ? "Cuộc gọi video" : "Cuộc gọi thoại";
  let statusText = "";
  let icon = isVideo ? "📹" : "📞";
  let isMissed = false;

  switch (status) {
    case "ended":
    case "connected":
      statusText = durationSec ? formatCallSecs(durationSec) : "Đã kết thúc";
      break;
    case "missed":
      isMissed = true;
      title = "Cuộc gọi nhỡ";
      statusText = isMe ? "Đối phương không nghe máy" : "Bạn đã nhỡ cuộc gọi";
      icon = "🔴";
      break;
    case "rejected":
      title = "Cuộc gọi bị từ chối";
      statusText = "Đã từ chối";
      break;
    case "cancelled":
      title = "Cuộc gọi đã hủy";
      statusText = "Đã hủy";
      break;
    default:
      statusText = status;
      break;
  }

  return (
    <div
      className={`px-3.5 py-2.5 rounded-2xl text-xs flex flex-col gap-1.5 ${
        isMe ? "ml-auto" : "mr-auto"
      }`}
      style={{
        backgroundColor: isMissed ? "rgba(239, 68, 68, 0.12)" : "#161929",
        border: isMissed ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid #1e2240",
        color: "#e8eaf2",
        minWidth: "180px",
        maxWidth: "240px",
        borderBottomRightRadius: isMe ? "4px" : "16px",
        borderBottomLeftRadius: !isMe ? "4px" : "16px",
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-xs truncate" style={{ color: isMissed ? "#f87171" : "#e8eaf2" }}>
            {title}
          </p>
          <p className="text-[11px]" style={{ color: "#a0a8c8" }}>
            {statusText}
          </p>
        </div>
      </div>
      {!isMe && isMissed && onCallBack && (
        <button
          type="button"
          onClick={() => onCallBack(callType)}
          className="w-full mt-1 py-1 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all card-hover"
          style={{
            background: "linear-gradient(135deg, #6c63ff, #5b54e8)",
            color: "#ffffff",
          }}
        >
          <span>{isVideo ? "📹" : "📞"}</span>
          <span>Gọi lại</span>
        </button>
      )}
    </div>
  );
}

function MessageBubble({
  msg,
  showRead,
  menuOpen,
  onToggleMenu,
  onRecall,
  onHide,
  onCallBack,
}: {
  msg: ChatMessage;
  showRead?: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onRecall: () => void;
  onHide: () => void;
  onCallBack?: (callType: "audio" | "video") => void;
}) {
  const isMe = msg.from === "me";
  const type = msg.msgType || "text";
  const isEmoji =
    !msg.recalled &&
    (type === "emoji" || (type === "text" && /^[\p{Emoji}\s]+$/u.test(msg.text) && msg.text.length <= 8));

  return (
    <div className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
      <div className="max-w-[75%] relative">
        {msg.recalled ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMenu();
            }}
            className="px-3.5 py-2.5 rounded-2xl text-sm italic text-left"
            style={{
              backgroundColor: "#111320",
              color: "#6b74a0",
              border: "1px solid #1e2240",
              ...(isMe ? { borderBottomRightRadius: "4px" } : { borderBottomLeftRadius: "4px" }),
            }}
          >
            Tin nhắn đã được thu hồi
          </button>
        ) : type === "call_log" ? (
          <CallLogBubble msg={msg} onCallBack={onCallBack} />
        ) : type === "image" && msg.mediaUrl ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMenu();
            }}
            className="block overflow-hidden rounded-2xl text-left"
            style={{ border: "1px solid #1e2240" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={msg.mediaUrl} alt="" className="max-h-64 w-full object-cover" />
          </button>
        ) : type === "video" && msg.mediaUrl ? (
          <div className="overflow-hidden rounded-2xl" style={{ border: "1px solid #1e2240", backgroundColor: "#111320" }}>
            <video src={msg.mediaUrl} controls playsInline className="max-h-64 w-full" onClick={(e) => e.stopPropagation()} />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleMenu();
              }}
              className="w-full text-xs py-1.5"
              style={{ color: "#6b74a0" }}
            >
              Tuỳ chọn
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMenu();
            }}
            className={`px-3.5 py-2.5 rounded-2xl leading-relaxed text-left ${isEmoji ? "text-3xl" : "text-sm"}`}
            style={
              isMe
                ? {
                    background: isEmoji ? "transparent" : "linear-gradient(135deg, #6c63ff, #5b54e8)",
                    color: "#fff",
                    borderBottomRightRadius: "4px",
                  }
                : {
                    backgroundColor: isEmoji ? "transparent" : "#161929",
                    color: "#e8eaf2",
                    border: isEmoji ? "none" : "1px solid #1e2240",
                    borderBottomLeftRadius: "4px",
                  }
            }
          >
            {msg.text}
          </button>
        )}

        {menuOpen && !msg.id.startsWith("local-") && (
          <div
            className={`absolute z-10 mt-1 flex flex-col overflow-hidden rounded-xl text-xs shadow-lg ${isMe ? "right-0" : "left-0"}`}
            style={{ backgroundColor: "#161929", border: "1px solid #1e2240", minWidth: 140 }}
            onClick={(e) => e.stopPropagation()}
          >
            {isMe && !msg.recalled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRecall();
                }}
                className="px-3 py-2 text-left hover:bg-[#1a1d2e]"
                style={{ color: "#e8eaf2" }}
              >
                Thu hồi
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onHide();
              }}
              className="px-3 py-2 text-left hover:bg-[#1a1d2e]"
              style={{ color: "#f87171" }}
            >
              Xóa phía tôi
            </button>
          </div>
        )}

        <p className={`text-xs mt-1 ${isMe ? "text-right" : ""}`} style={{ color: "#3a4060" }}>
          {msg.time}
          {showRead && !msg.recalled ? (
            <span style={{ color: "#6c63ff" }}> · Đã đọc</span>
          ) : null}
        </p>
      </div>
    </div>
  );
}

export default function ChatPanel({
  peer,
  myId,
  conversationId,
  isFriend = true,
  onClose,
}: {
  peer: NearbyUser;
  myId: string;
  myName: string;
  myAvatar: string;
  conversationId?: string;
  isFriend?: boolean;
  addingFriend?: boolean;
  onAddFriend?: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [peerLastReadAt, setPeerLastReadAt] = useState<string | null>(null);
  const [menuMsgId, setMenuMsgId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState<"image" | "video" | null>(null);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const {
    chatWsReady,
    sendChatWs,
    subscribeChatWs,
    setActiveConversationId,
  } = useApp();
  const { startCall, phase: callPhase } = useCall();
  const canChat = isFriend && !!conversationId;
  const inCall = callPhase !== "idle";

  const lastReadableMineId = (() => {
    if (!peerLastReadAt) return null;
    const readMs = new Date(peerLastReadAt).getTime();
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.from !== "me" || m.recalled || !m.createdAt || m.id.startsWith("local-")) continue;
      if (new Date(m.createdAt).getTime() <= readMs) return m.id;
    }
    return null;
  })();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing, uploading]);

  useEffect(() => {
    if (!canChat || !conversationId) {
      setActiveConversationId(null);
      return;
    }
    setActiveConversationId(conversationId);
    return () => setActiveConversationId(null);
  }, [canChat, conversationId, setActiveConversationId]);

  useEffect(() => {
    if (!canChat || !conversationId) {
      setMessages([]);
      setPeerLastReadAt(null);
      return;
    }

    let cancelled = false;

    const markRead = () => {
      sendChatWs({ type: "message.read", conversation_id: conversationId });
    };

    (async () => {
      try {
        const data = await likesApi.messages(conversationId);
        if (cancelled) return;
        setMessages([...data.messages].reverse().map((m) => mapServerMessage(m, myId)));
        setPeerLastReadAt(data.peer_last_read_at || null);
      } catch (e) {
        console.warn(e);
      }
    })();

    if (chatWsReady) markRead();

    const unsubscribe = subscribeChatWs((msg) => {
      if (msg.type === "message.new") {
        const m = (msg.message as Record<string, unknown>) || msg;
        if (String(m.conversation_id || "") !== conversationId) return;
        const mapped = mapServerMessage(
          {
            id: String(m.id),
            sender_id: String(m.sender_id),
            type: String(m.type || "text"),
            body: (m.body as string) ?? null,
            media_url: (m.media_url as string) ?? null,
            created_at: String(m.created_at || new Date().toISOString()),
          },
          myId,
        );
        setMessages((prev) => {
          if (prev.some((p) => p.id === mapped.id)) return prev;
          const idx = prev.findIndex(
            (p) =>
              p.id.startsWith("local-") &&
              p.from === "me" &&
              p.msgType === mapped.msgType &&
              (mapped.mediaUrl ? p.mediaUrl === mapped.mediaUrl : p.text === mapped.text),
          );
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = mapped;
            return next;
          }
          return [...prev, mapped];
        });
        if (mapped.from === "them") markRead();
      }
      if (msg.type === "message.read" && String(msg.conversation_id || "") === conversationId) {
        if (String(msg.user_id || "") !== myId && msg.last_read_at) {
          setPeerLastReadAt(String(msg.last_read_at));
        }
      }
      if (msg.type === "message.recalled" && String(msg.conversation_id || "") === conversationId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === String(msg.message_id || "")
              ? { ...m, recalled: true, text: "", mediaUrl: null }
              : m,
          ),
        );
        setMenuMsgId(null);
      }
      if (msg.type === "message.hidden" && String(msg.conversation_id || "") === conversationId) {
        setMessages((prev) => prev.filter((m) => m.id !== String(msg.message_id || "")));
        setMenuMsgId(null);
      }
      if (
        msg.type === "typing" &&
        String(msg.conversation_id || "") === conversationId &&
        String(msg.user_id || "") !== myId
      ) {
        setTyping(true);
        setTimeout(() => setTyping(false), 1500);
      }
      if (msg.type === "error") {
        const errText = String(msg.error || msg.message || "");
        // Call/WebRTC signaling errors belong in the call overlay, not chat.
        if (
          /call|webrtc|sdp|candidate|microphone|micro/i.test(errText) ||
          errText.includes("not active") ||
          errText.includes("not ringing")
        ) {
          return;
        }
        setError(errText || "Không gửi được tin nhắn");
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [canChat, conversationId, myId, chatWsReady, sendChatWs, subscribeChatWs]);

  useEffect(() => {
    if (!menuMsgId) return;
    const close = () => setMenuMsgId(null);
    const t = window.setTimeout(() => {
      window.addEventListener("click", close);
    }, 0);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("click", close);
    };
  }, [menuMsgId]);

  const wsSend = (payload: Record<string, unknown>, optimistic?: ChatMessage) => {
    if (!canChat) {
      setError("Hãy kết bạn để bắt đầu nhắn tin");
      return false;
    }
    if (!sendChatWs(payload)) {
      setError("Mất kết nối chat. Thử lại.");
      return false;
    }
    if (optimistic) setMessages((prev) => [...prev, optimistic]);
    return true;
  };

  const sendText = (raw: string, asEmoji = false) => {
    const text = raw.trim();
    if (!text || !conversationId) return;
    const msgType: ChatMsgType = asEmoji ? "emoji" : "text";
    const createdAt = new Date().toISOString();
    const ok = wsSend(
      {
        type: "message.send",
        conversation_id: conversationId,
        msg_type: msgType,
        body: text,
      },
      {
        id: `local-${Date.now()}`,
        from: "me",
        text,
        msgType,
        time: formatTime(createdAt),
        createdAt,
      },
    );
    if (ok) {
      setInput("");
      setShowEmoji(false);
      setError("");
    }
  };

  const sendMessage = () => sendText(input, false);

  const sendEmoji = (emoji: string) => {
    sendText(emoji, true);
  };

  const onPickMedia = async (file: File | undefined, kind: "image" | "video") => {
    if (!file || !conversationId) return;
    if (!canChat) {
      setError("Hãy kết bạn để bắt đầu nhắn tin");
      return;
    }
    setError("");
    setUploading(kind);
    try {
      const uploaded = await uploadsApi.file(file, kind);
      const publicUrl = uploaded.public_url;
      const createdAt = new Date().toISOString();
      wsSend(
        {
          type: "message.send",
          conversation_id: conversationId,
          msg_type: kind,
          body: kind === "image" ? "📷 Ảnh" : "🎬 Video",
          media_url: publicUrl,
        },
        {
          id: `local-${Date.now()}`,
          from: "me",
          text: kind === "image" ? "📷 Ảnh" : "🎬 Video",
          msgType: kind,
          mediaUrl: publicUrl,
          time: formatTime(createdAt),
          createdAt,
        },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload thất bại — kiểm tra R2 config");
    } finally {
      setUploading(null);
    }
  };

  const notifyTyping = () => {
    if (!canChat || !conversationId) return;
    sendChatWs({ type: "typing", conversation_id: conversationId });
  };

  const recallMessage = (messageId: string) => {
    if (!conversationId) return;
    const ok = wsSend({ type: "message.recall", message_id: messageId });
    if (ok) setError("");
  };

  const hideMessage = (messageId: string) => {
    if (!conversationId) return;
    // Optimistic remove; server confirms via message.hidden
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    setMenuMsgId(null);
    const ok = wsSend({ type: "message.hide", message_id: messageId });
    if (ok) setError("");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: "#0a0c14" }}>
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid #1e2240", backgroundColor: "#0d0f1a" }}
      >
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl"
          style={{ color: "#6b74a0" }}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <Avatar initials={peer.avatar} userId={peer.id} size="md" online={peer.online} photoUrl={peer.photoUrl} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: "#e8eaf2" }}>
            {peer.name}
          </p>
          <p className="text-xs" style={{ color: typing ? "#00e5ff" : "#6b74a0" }}>
            {typing
              ? "đang nhập…"
              : uploading
                ? `Đang tải ${uploading} lên R2…`
                : peer.online
                  ? "Đang online"
                  : "Offline"}
          </p>
        </div>
        {canChat && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              disabled={inCall}
              onClick={() => {
                if (!conversationId) return;
                void startCall({
                  conversationId,
                  targetUserId: peer.id,
                  callType: "audio",
                  peer: {
                    id: peer.id,
                    name: peer.name,
                    avatar: peer.avatar,
                    photoUrl: peer.photoUrl,
                  },
                });
              }}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-opacity disabled:opacity-40"
              style={{ backgroundColor: "#1a1d2e", color: "#9b94ff" }}
              title="Gọi thoại"
              aria-label="Gọi thoại"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </button>
            <button
              type="button"
              disabled={inCall}
              onClick={() => {
                if (!conversationId) return;
                void startCall({
                  conversationId,
                  targetUserId: peer.id,
                  callType: "video",
                  peer: {
                    id: peer.id,
                    name: peer.name,
                    avatar: peer.avatar,
                    photoUrl: peer.photoUrl,
                  },
                });
              }}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-opacity disabled:opacity-40"
              style={{ backgroundColor: "#1a1d2e", color: "#00e5ff" }}
              title="Gọi video"
              aria-label="Gọi video"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {!isFriend && (
        <div
          className="flex-shrink-0 px-4 py-3 flex items-center gap-3"
          style={{
            backgroundColor: "rgba(108,99,255,0.08)",
            borderBottom: "1px solid rgba(108,99,255,0.2)",
          }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: "#e8eaf2" }}>
              Kết bạn với {peer.name}?
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#6b74a0" }}>
              Kết bạn để bắt đầu trò chuyện realtime
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push(`/friends/${peer.id}`);
            }}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={{
              background: "linear-gradient(135deg, #6c63ff, #5b54e8)",
              color: "#fff",
              boxShadow: "0 4px 16px rgba(108,99,255,0.3)",
            }}
          >
            + Kết bạn
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" onClick={() => setMenuMsgId(null)}>
        {!isFriend && messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">👋</p>
            <p className="text-sm font-semibold" style={{ color: "#6b74a0" }}>
              Chưa thể nhắn tin
            </p>
            <p className="text-xs mt-1" style={{ color: "#3a4060" }}>
              Nhấn Kết bạn phía trên để mở chat
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            showRead={msg.id === lastReadableMineId}
            menuOpen={menuMsgId === msg.id}
            onToggleMenu={() => setMenuMsgId((id) => (id === msg.id ? null : msg.id))}
            onRecall={() => recallMessage(msg.id)}
            onHide={() => hideMessage(msg.id)}
            onCallBack={(callType) => {
              if (!conversationId) return;
              void startCall({
                conversationId,
                targetUserId: peer.id,
                callType,
                peer: {
                  id: peer.id,
                  name: peer.name,
                  avatar: peer.avatar,
                  photoUrl: peer.photoUrl,
                },
              });
            }}
          />
        ))}
        {typing && (
          <div className="flex items-end gap-2">
            <div
              className="px-4 py-3 rounded-2xl flex gap-1 items-center"
              style={{ backgroundColor: "#161929", border: "1px solid #1e2240", borderBottomLeftRadius: "4px" }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ backgroundColor: "#6b74a0", animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="px-4 pb-2">
          <p className="text-xs rounded-xl px-3 py-2" style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#f87171" }}>
            {error}
          </p>
        </div>
      )}

      {showEmoji && canChat && (
        <div
          className="mx-4 mb-2 p-3 rounded-2xl grid grid-cols-8 gap-1 slide-up"
          style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
        >
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => sendEmoji(e)}
              className="text-xl h-9 rounded-lg hover:bg-[#1a1d2e] transition-colors"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <div
        className="flex-shrink-0 px-4 py-3 flex items-center gap-2"
        style={{
          borderTop: "1px solid #1e2240",
          backgroundColor: "#0d0f1a",
          opacity: canChat ? 1 : 0.45,
          pointerEvents: canChat ? "auto" : "none",
        }}
      >
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            void onPickMedia(e.target.files?.[0], "image");
            e.target.value = "";
          }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(e) => {
            void onPickMedia(e.target.files?.[0], "video");
            e.target.value = "";
          }}
        />

        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={!!uploading || !canChat}
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "#1a1d2e", color: "#a0a8c8" }}
          title="Gửi ảnh (R2)"
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          disabled={!!uploading || !canChat}
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "#1a1d2e", color: "#a0a8c8" }}
          title="Gửi video (R2)"
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setShowEmoji((v) => !v)}
          disabled={!canChat}
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg"
          style={{
            backgroundColor: showEmoji ? "rgba(108,99,255,0.2)" : "#1a1d2e",
            color: showEmoji ? "#9b94ff" : "#a0a8c8",
          }}
          title="Emoji"
        >
          ☺
        </button>

        <div
          className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-2xl"
          style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
        >
          <input
            type="text"
            placeholder={canChat ? "Nhắn tin..." : "Kết bạn để nhắn tin"}
            value={input}
            disabled={!canChat}
            onChange={(e) => {
              setInput(e.target.value);
              notifyTyping();
            }}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "#e8eaf2" }}
          />
        </div>
        <button
          onClick={sendMessage}
          disabled={!canChat || !input.trim() || !!uploading}
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{
            background: canChat && input.trim() ? "linear-gradient(135deg, #6c63ff, #5b54e8)" : "#1a1d2e",
            color: canChat && input.trim() ? "#fff" : "#6b74a0",
          }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M22 2 11 13M22 2 15 22 11 13 2 9l20-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import { useCall } from "@/components/call/CallProvider";
import { useApp } from "@/components/providers/AppProvider";
import { conversationsApi, friendRequestsApi, friendsApi, likesApi, uploadsApi } from "@/lib/api";
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

function formatLastSeen(lastSeenAt?: string | null): string {
  if (!lastSeenAt) return "Không hoạt động";
  const date = new Date(lastSeenAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (isNaN(diffMs) || diffMs < 0) return "Vừa mới truy cập";

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) {
    return "Vừa mới truy cập";
  }
  if (diffMin < 60) {
    return `Truy cập ${diffMin} phút trước`;
  }
  if (diffHours < 24) {
    return `Truy cập ${diffHours} giờ trước`;
  }
  if (diffDays < 30) {
    return `Truy cập ${diffDays} ngày trước`;
  }
  return `Truy cập ngày ${date.toLocaleDateString("vi-VN")}`;
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
      className={`px-3.5 py-2.5 rounded-2xl text-xs flex flex-col gap-1.5 ${isMe ? "ml-auto" : "mr-auto"
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
  onAddFriend,
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
  const [showUnmatchModal, setShowUnmatchModal] = useState(false);
  const [unmatching, setUnmatching] = useState(false);
  const [showUnfriendModal, setShowUnfriendModal] = useState(false);
  const [unfriending, setUnfriending] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const {
    chatWsReady,
    sendChatWs,
    subscribeChatWs,
    setActiveConversationId,
    refreshMatches,
    matches,
    toggleFriend,
  } = useApp();
  const { startCall, phase: callPhase } = useCall();
  const isMatched = matches.some((m) => m.userId === peer.id);
  const [strangerBlocked, setStrangerBlocked] = useState(false);
  const [friendRequested, setFriendRequested] = useState(false);

  const [currConversationId, setCurrConversationId] = useState<string | undefined>(
    conversationId || peer.conversationId || matches.find((m) => m.userId === peer.id)?.conversationId,
  );
  const [peerOnline, setPeerOnline] = useState<boolean>(Boolean(peer.online));
  const [peerLastSeenAt, setPeerLastSeenAt] = useState<string | null>(peer.lastSeenAt || null);

  useEffect(() => {
    setPeerOnline(Boolean(peer.online));
    setPeerLastSeenAt(peer.lastSeenAt || null);
  }, [peer.id, peer.online, peer.lastSeenAt]);

  useEffect(() => {
    if (conversationId) {
      setCurrConversationId(conversationId);
    } else {
      const matchConv = matches.find((m) => m.userId === peer.id)?.conversationId;
      if (matchConv) setCurrConversationId(matchConv);
    }
  }, [conversationId, matches, peer.id]);

  const peerMsgPerm = peer.privacy?.message_permission ?? "everyone";
  const isBlockedByFriendsOnly = peerMsgPerm === "friends" && !isFriend && !isMatched;
  const canChat = !isBlockedByFriendsOnly;
  const inCall = callPhase !== "idle";

  useEffect(() => {
    if (isFriend) {
      setStrangerBlocked(false);
    }
  }, [isFriend]);

  useEffect(() => {
    if (isFriend) {
      setFriendRequested(false);
      return;
    }
    let cancelled = false;
    friendRequestsApi
      .list()
      .then((data) => {
        if (cancelled) return;
        const isSent = data.sent?.some((req) => req.user_id === peer.id);
        if (isSent) setFriendRequested(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [peer.id, isFriend]);

  const handleAddFriend = () => {
    router.push(`/friends/${peer.id}`);
  };

  const ensureConversation = async (): Promise<string | null> => {
    if (currConversationId) return currConversationId;
    try {
      const res = await conversationsApi.direct(peer.id);
      if (res.conversation_id) {
        setCurrConversationId(res.conversation_id);
        void refreshMatches();
        return res.conversation_id;
      }
    } catch (err: unknown) {
      console.error("Failed to create conversation:", err);
      const errMsg = (err as Error)?.message || "";
      if (errMsg.includes("bạn bè") || !isFriend) {
        setStrangerBlocked(true);
      }
    }
    return null;
  };

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
  }, [messages, typing, uploading, strangerBlocked]);

  useEffect(() => {
    if (!currConversationId) {
      setActiveConversationId(null);
      return;
    }
    setActiveConversationId(currConversationId);
    return () => setActiveConversationId(null);
  }, [currConversationId, setActiveConversationId]);

  useEffect(() => {
    if (!currConversationId) {
      setMessages([]);
      setPeerLastReadAt(null);
      return;
    }

    let cancelled = false;

    const markRead = () => {
      sendChatWs({ type: "message.read", conversation_id: currConversationId });
    };

    (async () => {
      try {
        const data = await likesApi.messages(currConversationId);
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
        if (String(m.conversation_id || "") !== currConversationId) return;
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
      if (msg.type === "message.read" && String(msg.conversation_id || "") === currConversationId) {
        if (String(msg.user_id || "") !== myId && msg.last_read_at) {
          setPeerLastReadAt(String(msg.last_read_at));
        }
      }
      if (msg.type === "message.recalled" && String(msg.conversation_id || "") === currConversationId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === String(msg.message_id || "")
              ? { ...m, recalled: true, text: "", mediaUrl: null }
              : m,
          ),
        );
        setMenuMsgId(null);
      }
      if (msg.type === "message.hidden" && String(msg.conversation_id || "") === currConversationId) {
        setMessages((prev) => prev.filter((m) => m.id !== String(msg.message_id || "")));
        setMenuMsgId(null);
      }
      if (msg.type === "presence.update" && String(msg.user_id || "") === peer.id) {
        const isOnline = Boolean(msg.online);
        setPeerOnline(isOnline);
        if (isOnline) {
          setPeerLastSeenAt(null);
        } else {
          setPeerLastSeenAt(String(msg.last_seen_at || new Date().toISOString()));
        }
      }
      if (
        msg.type === "typing" &&
        String(msg.conversation_id || "") === currConversationId &&
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
        if (errText.includes("bạn bè") || errText.includes("người lạ") || !isFriend) {
          setStrangerBlocked(true);
          return;
        }
        setError(errText || "Không gửi được tin nhắn");
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [currConversationId, myId, peer.id, chatWsReady, sendChatWs, subscribeChatWs]);

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
    if (isBlockedByFriendsOnly) {
      setStrangerBlocked(true);
      if (optimistic) setMessages((prev) => [...prev, optimistic]);
      return false;
    }
    if (!sendChatWs(payload)) {
      setError("Mất kết nối chat. Thử lại.");
      return false;
    }
    if (optimistic) setMessages((prev) => [...prev, optimistic]);
    return true;
  };

  const sendText = async (raw: string, asEmoji = false) => {
    const text = raw.trim();
    if (!text) return;

    const msgType: ChatMsgType = asEmoji ? "emoji" : "text";
    const createdAt = new Date().toISOString();
    const optimisticMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      from: "me",
      text,
      msgType,
      time: formatTime(createdAt),
      createdAt,
    };

    // Always show sent message in chat
    setMessages((prev) => [...prev, optimisticMsg]);
    setInput("");
    setShowEmoji(false);
    setError("");

    if (isBlockedByFriendsOnly) {
      setStrangerBlocked(true);
      return;
    }

    let targetConvId = currConversationId;
    if (!targetConvId) {
      targetConvId = (await ensureConversation()) || undefined;
      if (!targetConvId) {
        if (!isFriend || isBlockedByFriendsOnly) {
          setStrangerBlocked(true);
        } else {
          setError("Không thể gửi tin nhắn. Vui lòng thử lại.");
        }
        return;
      }
    }

    const ok = sendChatWs({
      type: "message.send",
      conversation_id: targetConvId,
      msg_type: msgType,
      body: text,
    });
    if (!ok) {
      setError("Mất kết nối chat. Thử lại.");
    }
  };

  const sendMessage = () => void sendText(input, false);

  const sendEmoji = (emoji: string) => {
    void sendText(emoji, true);
  };

  const onPickMedia = async (file: File | undefined, kind: "image" | "video") => {
    if (!file) return;
    setError("");
    const localId = `local-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const tempUrl = URL.createObjectURL(file);

    setMessages((prev) => [
      ...prev,
      {
        id: localId,
        from: "me",
        text: kind === "image" ? "📷 Ảnh" : "🎬 Video",
        msgType: kind,
        mediaUrl: tempUrl,
        time: formatTime(createdAt),
        createdAt,
      },
    ]);

    if (isBlockedByFriendsOnly) {
      setStrangerBlocked(true);
      return;
    }

    let targetConvId = currConversationId;
    if (!targetConvId) {
      targetConvId = (await ensureConversation()) || undefined;
      if (!targetConvId) {
        if (!isFriend || isBlockedByFriendsOnly) {
          setStrangerBlocked(true);
        } else {
          setError("Không thể gửi tệp. Vui lòng thử lại.");
        }
        return;
      }
    }

    setUploading(kind);
    try {
      const uploaded = await uploadsApi.file(file, kind);
      const publicUrl = uploaded.public_url;
      sendChatWs({
        type: "message.send",
        conversation_id: targetConvId,
        msg_type: kind,
        body: kind === "image" ? "📷 Ảnh" : "🎬 Video",
        media_url: publicUrl,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload thất bại — kiểm tra R2 config");
    } finally {
      setUploading(null);
    }
  };

  const notifyTyping = () => {
    if (isBlockedByFriendsOnly || !currConversationId) return;
    sendChatWs({ type: "typing", conversation_id: currConversationId });
  };

  const recallMessage = (messageId: string) => {
    if (!currConversationId) return;
    const ok = wsSend({ type: "message.recall", message_id: messageId });
    if (ok) setError("");
  };

  const hideMessage = (messageId: string) => {
    if (!currConversationId) return;
    // Optimistic remove; server confirms via message.hidden
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    setMenuMsgId(null);
    const ok = wsSend({ type: "message.hide", message_id: messageId });
    if (ok) setError("");
  };

  const handleUnmatch = async () => {
    setUnmatching(true);
    try {
      await likesApi.unmatch(peer.id);
      await refreshMatches();
      setShowUnmatchModal(false);
      onClose();
    } catch (err) {
      console.error("Failed to unmatch:", err);
    } finally {
      setUnmatching(false);
    }
  };

  const handleUnfriend = async () => {
    setUnfriending(true);
    try {
      await friendsApi.unfriend(peer.id);
      await refreshMatches();
      setShowUnfriendModal(false);
      onClose();
    } catch (err) {
      console.error("Failed to unfriend:", err);
      setError("Hủy kết bạn thất bại. Vui lòng thử lại.");
    } finally {
      setUnfriending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: "#0a0c14" }}>
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0 relative"
        style={{ borderBottom: "1px solid #1e2240", backgroundColor: "#0d0f1a" }}
      >
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl cursor-pointer"
          style={{ color: "#6b74a0" }}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => router.push(`/wall/${peer.id}`)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-85 transition-opacity cursor-pointer group"
          title={`Xem trang cá nhân của ${peer.name}`}
        >
          <Avatar
            initials={peer.avatar}
            userId={peer.id}
            size="md"
            online={isFriend && (peer.privacy?.show_online !== false) && peerOnline}
            photoUrl={peer.photoUrl}
            className="group-hover:scale-105 transition-transform"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate group-hover:text-[#818cf8] transition-colors" style={{ color: "#e8eaf2" }}>
              {peer.name}
            </p>
            {(() => {
              if (typing) {
                return (
                  <p className="text-xs font-medium" style={{ color: "#00e5ff" }}>
                    đang nhập…
                  </p>
                );
              }
              if (!isFriend) {
                return (
                  <p className="text-xs font-medium" style={{ color: "#f59e0b" }}>
                    Người lạ
                  </p>
                );
              }
              const showOnline = peer.privacy?.show_online !== false;
              if (!showOnline) {
                return null;
              }
              if (peerOnline) {
                return (
                  <p className="text-xs font-medium" style={{ color: "#10b981" }}>
                    Vừa mới truy cập
                  </p>
                );
              }
              return (
                <p className="text-xs" style={{ color: "#8b95b8" }}>
                  {formatLastSeen(peerLastSeenAt || peer.lastSeenAt)}
                </p>
              );
            })()}
          </div>
        </button>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            disabled={inCall}
            onClick={async () => {
              const peerCallPerm = peer.privacy?.call_permission ?? "everyone";
              if (peerCallPerm === "friends" && !isFriend && !isMatched) {
                setError("Đối phương chỉ nhận cuộc gọi từ bạn bè");
                return;
              }
              let targetConvId = currConversationId;
              if (!targetConvId) {
                targetConvId = (await ensureConversation()) || undefined;
                if (!targetConvId) {
                  setError("Không thể khởi tạo cuộc gọi");
                  return;
                }
              }
              void startCall({
                conversationId: targetConvId,
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
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-opacity disabled:opacity-40 cursor-pointer"
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
            onClick={async () => {
              const peerCallPerm = peer.privacy?.call_permission ?? "everyone";
              if (peerCallPerm === "friends" && !isFriend && !isMatched) {
                setError("Đối phương chỉ nhận cuộc gọi từ bạn bè");
                return;
              }
              let targetConvId = currConversationId;
              if (!targetConvId) {
                targetConvId = (await ensureConversation()) || undefined;
                if (!targetConvId) {
                  setError("Không thể khởi tạo cuộc gọi");
                  return;
                }
              }
              void startCall({
                conversationId: targetConvId,
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
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-opacity disabled:opacity-40 cursor-pointer"
            style={{ backgroundColor: "#1a1d2e", color: "#00e5ff" }}
            title="Gọi video"
            aria-label="Gọi video"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
          </button>

          {/* Menu Options Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowOptionsMenu((prev) => !prev)}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10 cursor-pointer"
              style={{ backgroundColor: "#1a1d2e", color: "#a0a8c8" }}
              title="Tùy chọn khác"
            >
              ⋮
            </button>

            {showOptionsMenu && (
              <div
                className="absolute right-0 top-12 w-48 py-1.5 rounded-2xl bg-[#141729] border border-[#1e2240] shadow-2xl z-30 animate-fade-in text-xs font-medium"
                onClick={() => setShowOptionsMenu(false)}
              >
                <button
                  onClick={() => router.push(`/wall/${peer.id}`)}
                  className="w-full px-4 py-2.5 text-left flex items-center gap-2 text-gray-300 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <span>👤</span> Trang cá nhân
                </button>

                {isFriend && (
                  <button
                    onClick={() => setShowUnfriendModal(true)}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-2 text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer border-t border-white/5"
                  >
                    <span>👥</span> Hủy kết bạn (Xóa bạn)
                  </button>
                )}

                {isMatched && (
                  <button
                    onClick={() => setShowUnmatchModal(true)}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-2 text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer border-t border-white/5"
                  >
                    <span>💔</span> Hủy tương hợp (Unmatch)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {!isFriend && !isMatched && (
        <button
          type="button"
          onClick={friendRequested ? undefined : handleAddFriend}
          disabled={friendRequested}
          className={`w-full py-2.5 px-4 flex items-center justify-center gap-2 text-xs font-semibold transition-colors ${
            friendRequested ? "cursor-default opacity-85" : "cursor-pointer hover:bg-[#22263d]"
          }`}
          style={{
            backgroundColor: friendRequested ? "#141729" : "#1a1d2e",
            color: friendRequested ? "#a0a8c8" : "#e8eaf2",
            border: "none",
          }}
        >
          {friendRequested ? (
            <>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="text-indigo-400">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Đã gửi lời mời kết bạn</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              <span>Kết bạn</span>
            </>
          )}
        </button>
      )}

      {isMatched && !isFriend && (
        <div
          className="flex-shrink-0 px-4 py-2.5 flex items-center justify-between gap-3"
          style={{
            backgroundColor: "rgba(255, 75, 114, 0.08)",
            borderBottom: "1px solid rgba(255, 75, 114, 0.2)",
          }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold flex items-center gap-1" style={{ color: "#ff8fa3" }}>
              <span>💖</span> Hai bạn đã tương hợp hẹn hò!
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "#8a94b8" }}>
              Kết bạn để xem toàn bộ bài viết & chia sẻ khoảnh khắc
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push(`/friends/${peer.id}`);
            }}
            className="flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-95 active:scale-95 cursor-pointer flex items-center gap-1 shadow-md"
            style={{
              background: "linear-gradient(135deg, #ff4b72, #6c63ff)",
              color: "#fff",
            }}
          >
            <span>👥</span> Kết bạn
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" onClick={() => setMenuMsgId(null)}>
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">👋</p>
            <p className="text-sm font-semibold" style={{ color: "#e8eaf2" }}>
              Bắt đầu trò chuyện
            </p>
            <p className="text-xs mt-1" style={{ color: "#8a94b8" }}>
              Hãy gửi lời chào đầu tiên đến {peer.name}!
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
              if (!currConversationId) return;
              void startCall({
                conversationId: currConversationId,
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
        {strangerBlocked && (
          <div
            className="p-3.5 rounded-2xl flex items-center gap-3 slide-up my-2"
            style={{
              backgroundColor: "#1a1d2e",
              border: "1px solid #1e2240",
            }}
          >
            <Avatar
              initials={peer.avatar}
              userId={peer.id}
              size="sm"
              photoUrl={peer.photoUrl}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs leading-relaxed" style={{ color: "#e8eaf2" }}>
                <span className="font-bold text-white">{peer.name}</span> không nhận tin nhắn từ người lạ. Kết bạn ngay để gửi tin nhắn.
              </p>
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

      {showEmoji && (
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
          disabled={!!uploading}
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 cursor-pointer"
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
          disabled={!!uploading}
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 cursor-pointer"
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
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg cursor-pointer"
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
            placeholder="Nhắn tin..."
            value={input}
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
          disabled={!input.trim() || !!uploading}
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 cursor-pointer transition-all"
          style={{
            background: input.trim() ? "linear-gradient(135deg, #6c63ff, #5b54e8)" : "#1a1d2e",
            color: input.trim() ? "#fff" : "#6b74a0",
          }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M22 2 11 13M22 2 15 22 11 13 2 9l20-7z" />
          </svg>
        </button>
      </div>

      {/* Unmatch Confirmation Modal */}
      {showUnmatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-sm rounded-3xl bg-[#111320] border border-[#1e2240] p-6 shadow-2xl space-y-4 text-center animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center text-3xl mx-auto">
              💔
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">Hủy tương hợp với {peer.name}?</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Cuộc trò chuyện hẹn hò sẽ kết thúc và cả hai sẽ không còn xuất hiện trong danh sách ghép đôi của nhau.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={unmatching}
                onClick={() => setShowUnmatchModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                disabled={unmatching}
                onClick={handleUnmatch}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:opacity-90 text-xs font-bold text-white shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {unmatching ? "Đang hủy..." : "Xác nhận Hủy"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unfriend Confirmation Modal */}
      {showUnfriendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-sm rounded-3xl bg-[#111320] border border-[#1e2240] p-6 shadow-2xl space-y-4 text-center animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-3xl mx-auto">
              👥
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">Xóa kết bạn với {peer.name}?</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Bạn và {peer.name} sẽ không còn là bạn bè của nhau nữa. Bạn vẫn có thể gửi lời mời kết bạn lại bất cứ lúc nào.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={unfriending}
                onClick={() => setShowUnfriendModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                disabled={unfriending}
                onClick={handleUnfriend}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:opacity-90 text-xs font-bold text-white shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {unfriending ? "Đang xóa..." : "Xác nhận Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

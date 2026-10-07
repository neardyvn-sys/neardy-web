"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import ChatInfoDrawer from "./ChatInfoDrawer";
import { useCall } from "@/components/call/CallProvider";
import { useApp } from "@/components/providers/AppProvider";
import { conversationsApi, friendRequestsApi, friendsApi, likesApi, uploadsApi, type FriendRequestItem } from "@/lib/api";
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

function formatDateDivider(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const isSameYear = date.getFullYear() === now.getFullYear();

  if (isToday) {
    return "Hôm nay";
  }
  if (isYesterday) {
    return "Hôm qua";
  }

  const weekday = date.toLocaleDateString("vi-VN", { weekday: "long" });
  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

  if (isSameYear) {
    return `${capitalizedWeekday}, ${date.getDate()} thg ${date.getMonth() + 1}`;
  }
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center my-3 select-none">
      <div
        className="px-3.5 py-1 rounded-full text-[11px] font-medium tracking-wide shadow-sm"
        style={{
          backgroundColor: "rgba(22, 25, 41, 0.88)",
          backdropFilter: "blur(8px)",
          color: "#8b95b8",
          border: "1px solid rgba(30, 34, 64, 0.8)",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function TimeSeparator({ time }: { time: string }) {
  return (
    <div className="flex items-center justify-center my-2 select-none">
      <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase px-2 py-0.5 rounded-md">
        {time}
      </span>
    </div>
  );
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
  showRead,
  onCallBack,
}: {
  msg: ChatMessage;
  showRead?: boolean;
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
          className="w-full mt-1 py-1 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all card-hover cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #6c63ff, #5b54e8)",
            color: "#ffffff",
          }}
        >
          <span>{isVideo ? "📹" : "📞"}</span>
          <span>Gọi lại</span>
        </button>
      )}
      <div className="flex items-center justify-between text-[10px] pt-1 mt-0.5 border-t border-white/5 select-none" style={{ color: "#7e87ab" }}>
        <span>{msg.time}</span>
        {showRead && isMe && !msg.recalled && (
          <span style={{ color: "#818cf8" }}>Đã đọc</span>
        )}
      </div>
    </div>
  );
}

function MessageBubble({
  msg,
  peer,
  isFirstInGroup = true,
  isLastInGroup = true,
  showAvatar = true,
  showRead,
  menuOpen,
  onToggleMenu,
  onRecall,
  onHide,
  onCallBack,
}: {
  msg: ChatMessage;
  peer: NearbyUser;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  showAvatar?: boolean;
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

  // Dynamic corner radius depending on position in message group
  const bubbleRadiusStyle: React.CSSProperties = isMe
    ? {
      borderTopLeftRadius: "18px",
      borderBottomLeftRadius: "18px",
      borderTopRightRadius: isFirstInGroup ? "18px" : "6px",
      borderBottomRightRadius: isLastInGroup ? "4px" : "6px",
    }
    : {
      borderTopRightRadius: "18px",
      borderBottomRightRadius: "18px",
      borderTopLeftRadius: isFirstInGroup ? "18px" : "6px",
      borderBottomLeftRadius: isLastInGroup ? "4px" : "6px",
    };

  return (
    <div className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
      {/* Peer Avatar on left side (them) */}
      {!isMe && (
        <div className="w-7 h-7 flex-shrink-0 mb-1">
          {showAvatar ? (
            <Avatar
              initials={peer.avatar}
              userId={peer.id}
              photoUrl={peer.photoUrl}
              size="xs"
              className="rounded-full hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-7 h-7" />
          )}
        </div>
      )}

      <div className="max-w-[75%] relative flex flex-col">
        {msg.recalled ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMenu();
            }}
            className="px-3.5 py-2 text-sm italic text-left flex items-baseline justify-between gap-3 cursor-pointer"
            style={{
              backgroundColor: "#111320",
              color: "#6b74a0",
              border: "1px solid #1e2240",
              ...bubbleRadiusStyle,
            }}
          >
            <span>Tin nhắn đã được thu hồi</span>
            <span className="text-[10px] text-[#545d82] select-none flex-shrink-0 not-italic">
              {msg.time}
            </span>
          </button>
        ) : type === "call_log" ? (
          <CallLogBubble msg={msg} showRead={showRead} onCallBack={onCallBack} />
        ) : type === "image" && msg.mediaUrl ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMenu();
            }}
            className="block overflow-hidden text-left relative group cursor-pointer"
            style={{ border: "1px solid #1e2240", ...bubbleRadiusStyle }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={msg.mediaUrl} alt="" className="max-h-64 w-full object-cover" />
            <div
              className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md text-[10px] text-white/90 flex items-center gap-1 select-none shadow-md"
              style={{ backgroundColor: "rgba(10, 12, 20, 0.75)", backdropFilter: "blur(4px)" }}
            >
              <span>{msg.time}</span>
              {showRead && !msg.recalled && (
                <span className={isMe ? "text-white font-medium" : "text-[#818cf8]"}>· Đã đọc</span>
              )}
            </div>
          </button>
        ) : type === "video" && msg.mediaUrl ? (
          <div
            className="overflow-hidden relative"
            style={{ border: "1px solid #1e2240", backgroundColor: "#111320", ...bubbleRadiusStyle }}
          >
            <video src={msg.mediaUrl} controls playsInline className="max-h-64 w-full" onClick={(e) => e.stopPropagation()} />
            <div className="flex items-center justify-between px-3 py-1.5 text-xs" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMenu();
                }}
                className="text-xs hover:underline cursor-pointer"
                style={{ color: "#6b74a0" }}
              >
                Tuỳ chọn
              </button>
              <div className="text-[10px] flex items-center gap-1 select-none" style={{ color: "#7e87ab" }}>
                <span>{msg.time}</span>
                {showRead && !msg.recalled && (
                  <span className={isMe ? "text-white/90 font-medium" : "text-[#818cf8]"}>· Đã đọc</span>
                )}
              </div>
            </div>
          </div>
        ) : type === "audio" && msg.mediaUrl ? (
          <div
            className="px-3.5 py-2.5 rounded-2xl flex items-center gap-3"
            style={
              isMe
                ? {
                    background: "linear-gradient(135deg, #6c63ff, #5b54e8)",
                    color: "#fff",
                    minWidth: "220px",
                    ...bubbleRadiusStyle,
                  }
                : {
                    backgroundColor: "#161929",
                    color: "#e8eaf2",
                    border: "1px solid #1e2240",
                    minWidth: "220px",
                    ...bubbleRadiusStyle,
                  }
            }
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm flex-shrink-0">
              🎙️
            </div>
            <div className="flex-1 min-w-0">
              <audio src={msg.mediaUrl} controls className="w-full h-8" />
              <div className="flex justify-between text-[10px] opacity-75 mt-1 select-none">
                <span>Tin nhắn thoại</span>
                <span>{msg.time}</span>
              </div>
            </div>
          </div>
        ) : type === "file" && msg.mediaUrl ? (
          <a
            href={msg.mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="px-3.5 py-2.5 rounded-2xl flex items-center gap-3 group transition-colors cursor-pointer"
            style={
              isMe
                ? {
                    background: "linear-gradient(135deg, #6c63ff, #5b54e8)",
                    color: "#fff",
                    minWidth: "220px",
                    maxWidth: "280px",
                    ...bubbleRadiusStyle,
                  }
                : {
                    backgroundColor: "#161929",
                    color: "#e8eaf2",
                    border: "1px solid #1e2240",
                    minWidth: "220px",
                    maxWidth: "280px",
                    ...bubbleRadiusStyle,
                  }
            }
          >
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-lg flex-shrink-0">
              📁
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate group-hover:underline">
                {msg.text.replace(/^📁\s*/, "") || "Tệp tin đính kèm"}
              </p>
              <p className="text-[10px] opacity-75 mt-0.5 flex items-center gap-1 select-none">
                <span>Tải về</span>
                <span>· {msg.time}</span>
              </p>
            </div>
          </a>
        ) : type === "location" ? (
          <div
            className="px-3.5 py-2.5 rounded-2xl flex flex-col gap-1.5"
            style={
              isMe
                ? {
                    background: "linear-gradient(135deg, #6c63ff, #5b54e8)",
                    color: "#fff",
                    minWidth: "200px",
                    ...bubbleRadiusStyle,
                  }
                : {
                    backgroundColor: "#161929",
                    color: "#e8eaf2",
                    border: "1px solid #1e2240",
                    minWidth: "200px",
                    ...bubbleRadiusStyle,
                  }
            }
          >
            <div className="flex items-center gap-2">
              <span className="text-base">📍</span>
              <p className="text-xs font-bold">Vị trí đã chia sẻ</p>
            </div>
            {msg.text.includes("http") ? (
              <a
                href={msg.text.replace(/^.*?https?:\/\//, "https://")}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] underline opacity-90 hover:opacity-100 mt-0.5 break-all"
              >
                Mở trên Google Maps ↗
              </a>
            ) : (
              <p className="text-xs">{msg.text}</p>
            )}
            <span className="text-[10px] opacity-75 self-end mt-0.5 select-none">{msg.time}</span>
          </div>
        ) : isEmoji ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMenu();
            }}
            className="flex flex-col text-left cursor-pointer px-1 py-0.5"
          >
            <span className="text-3xl leading-none">{msg.text}</span>
            <span className={`text-[10px] mt-1 select-none flex items-center gap-1 ${isMe ? "self-end text-white/60" : "self-start text-[#7e87ab]"}`}>
              <span>{msg.time}</span>
              {showRead && !msg.recalled ? (
                <span className={isMe ? "text-white/80 font-medium" : "text-[#818cf8]"}> · Đã đọc</span>
              ) : null}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMenu();
            }}
            className="px-3.5 py-2 leading-relaxed text-left text-sm flex flex-col min-w-[70px] cursor-pointer"
            style={
              isMe
                ? {
                  background: "linear-gradient(135deg, #6c63ff, #5b54e8)",
                  color: "#fff",
                  ...bubbleRadiusStyle,
                }
                : {
                  backgroundColor: "#161929",
                  color: "#e8eaf2",
                  border: "1px solid #1e2240",
                  ...bubbleRadiusStyle,
                }
            }
          >
            <span className="break-words whitespace-pre-wrap">{msg.text}</span>
            <span
              className={`text-[10px] flex items-center gap-1 self-end mt-0.5 -mb-0.5 select-none ${
                isMe ? "text-white/70" : "text-[#7e87ab]"
              }`}
            >
              <span>{msg.time}</span>
              {showRead && !msg.recalled ? (
                <span className={isMe ? "text-white font-medium" : "text-[#818cf8]"}> · Đã đọc</span>
              ) : null}
            </span>
          </button>
        )}

        {menuOpen && !msg.id.startsWith("local-") && (
          <div
            className={`absolute z-20 mt-1 flex flex-col overflow-hidden rounded-xl text-xs shadow-lg ${isMe ? "right-0" : "left-0"}`}
            style={{ backgroundColor: "#161929", border: "1px solid #1e2240", minWidth: 140, top: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            {isMe && !msg.recalled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRecall();
                }}
                className="px-3 py-2 text-left hover:bg-[#1a1d2e] cursor-pointer"
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
              className="px-3 py-2 text-left hover:bg-[#1a1d2e] cursor-pointer"
              style={{ color: "#f87171" }}
            >
              Xóa phía tôi
            </button>
          </div>
        )}
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
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [menuMsgId, setMenuMsgId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState<"image" | "video" | null>(null);
  const [error, setError] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const isPrependingRef = useRef<boolean>(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const [showUnmatchModal, setShowUnmatchModal] = useState(false);
  const [unmatching, setUnmatching] = useState(false);
  const [showUnfriendModal, setShowUnfriendModal] = useState(false);
  const [unfriending, setUnfriending] = useState(false);
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const {
    chatWsReady,
    sendChatWs,
    subscribeChatWs,
    setActiveConversationId,
    refreshMatches,
    matches,
    friends,
    toggleFriend,
  } = useApp();
  const [localIsFriend, setLocalIsFriend] = useState(false);
  const isFriendEffective = Boolean(isFriend || friends?.has(peer.id) || localIsFriend);
  const { startCall, phase: callPhase } = useCall();
  const isMatched = matches.some((m) => m.userId === peer.id && m.isFriend !== false);
  const [strangerBlocked, setStrangerBlocked] = useState(false);
  const [friendRequested, setFriendRequested] = useState(false);
  const [receivedRequest, setReceivedRequest] = useState<FriendRequestItem | null>(null);
  const [handlingFriendRequest, setHandlingFriendRequest] = useState(false);

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
      if (matchConv) {
        setCurrConversationId(matchConv);
      } else {
        void ensureConversation();
      }
    }
  }, [conversationId, matches, peer.id]);

  const peerMsgPerm = peer.privacy?.message_permission ?? "everyone";
  const isBlockedByFriendsOnly = peerMsgPerm === "friends" && !isFriendEffective && !isMatched;
  const canChat = !isBlockedByFriendsOnly;
  const inCall = callPhase !== "idle";

  useEffect(() => {
    if (isFriendEffective) {
      setStrangerBlocked(false);
    }
  }, [isFriendEffective]);

  useEffect(() => {
    if (isFriendEffective) {
      setFriendRequested(false);
      setReceivedRequest(null);
      return;
    }
    let cancelled = false;
    friendRequestsApi
      .list()
      .then((data) => {
        if (cancelled) return;
        const isSent = data.sent?.some((req) => req.user_id === peer.id);
        setFriendRequested(Boolean(isSent));
        const received = data.received?.find((req) => req.user_id === peer.id) || null;
        setReceivedRequest(received);
      })
      .catch(() => { });
    return () => {
      cancelled = true;
    };
  }, [peer.id, isFriendEffective]);

  const handleAddFriend = () => {
    router.push(`/friends/${peer.id}`);
  };

  const handleAcceptFriendRequest = async () => {
    if (!receivedRequest || handlingFriendRequest) return;
    setHandlingFriendRequest(true);
    try {
      await friendRequestsApi.accept(receivedRequest.id);
      setReceivedRequest(null);
      setLocalIsFriend(true);
      if (onAddFriend) {
        void onAddFriend();
      }
      await refreshMatches();
    } catch (err) {
      console.error("Failed to accept friend request:", err);
      setError("Chấp nhận lời mời kết bạn thất bại.");
    } finally {
      setHandlingFriendRequest(false);
    }
  };

  const handleRejectFriendRequest = async () => {
    if (!receivedRequest || handlingFriendRequest) return;
    setHandlingFriendRequest(true);
    try {
      await friendRequestsApi.reject(receivedRequest.id);
      setReceivedRequest(null);
    } catch (err) {
      console.error("Failed to reject friend request:", err);
    } finally {
      setHandlingFriendRequest(false);
    }
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
      if (errMsg.includes("bạn bè") || errMsg.includes("người lạ") || isBlockedByFriendsOnly) {
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

  // Scroll anchoring when older messages are prepended
  useLayoutEffect(() => {
    if (isPrependingRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const heightDiff = container.scrollHeight - prevScrollHeightRef.current;
      container.scrollTop += heightDiff;
      isPrependingRef.current = false;
    }
  }, [messages]);

  // Auto-scroll when typing, uploading, or stranger blocked updates
  useEffect(() => {
    if (typing || uploading || strangerBlocked) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [typing, uploading, strangerBlocked]);

  useEffect(() => {
    if (!currConversationId) {
      setActiveConversationId(null);
      return;
    }
    setActiveConversationId(currConversationId);
    return () => setActiveConversationId(null);
  }, [currConversationId, setActiveConversationId]);

  // Load older messages (Scroll Up)
  const loadOlderMessages = async () => {
    if (!currConversationId || loadingMore || !hasMore || initialLoading) return;
    const oldestServerMsg = messages.find((m) => !m.id.startsWith("local-") && m.createdAt);
    if (!oldestServerMsg || !oldestServerMsg.createdAt) {
      setHasMore(false);
      return;
    }

    setLoadingMore(true);
    const container = scrollContainerRef.current;
    if (container) {
      prevScrollHeightRef.current = container.scrollHeight;
      isPrependingRef.current = true;
    }

    try {
      const data = await likesApi.messages(currConversationId, oldestServerMsg.createdAt, 30);
      const olderMapped = [...data.messages].reverse().map((m) => mapServerMessage(m, myId));
      if (olderMapped.length === 0) {
        setHasMore(false);
      } else {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const filtered = olderMapped.filter((o) => !existingIds.has(o.id));
          return [...filtered, ...prev];
        });
        setHasMore(data.has_more ?? (data.messages.length >= 30));
      }
    } catch (err) {
      console.error("Failed to load older messages:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (container.scrollTop < 80 && hasMore && !loadingMore && !initialLoading) {
      void loadOlderMessages();
    }
  };

  useEffect(() => {
    if (!currConversationId) {
      setMessages([]);
      setPeerLastReadAt(null);
      setHasMore(false);
      setInitialLoading(false);
      return;
    }

    let cancelled = false;
    setInitialLoading(true);
    setHasMore(true);

    const markRead = () => {
      sendChatWs({ type: "message.read", conversation_id: currConversationId });
    };

    (async () => {
      try {
        const data = await likesApi.messages(currConversationId, undefined, 30);
        if (cancelled) return;
        const initialMessages = [...data.messages].reverse().map((m) => mapServerMessage(m, myId));
        setMessages(initialMessages);
        setPeerLastReadAt(data.peer_last_read_at || null);
        setHasMore(data.has_more ?? (data.messages.length >= 30));
        setInitialLoading(false);
        // Scroll to bottom after initial load
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
        }, 30);
      } catch (e) {
        console.warn(e);
        if (!cancelled) setInitialLoading(false);
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
              (mapped.msgType === "image" || mapped.msgType === "video"
                ? true
                : p.text === mapped.text),
          );
          if (idx >= 0) {
            const localMsg = prev[idx];
            if (localMsg.mediaUrl?.startsWith("blob:")) {
              try {
                URL.revokeObjectURL(localMsg.mediaUrl);
              } catch {
                // ignore
              }
            }
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
        if (errText.includes("bạn bè") || errText.includes("người lạ") || isBlockedByFriendsOnly) {
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
        if (isBlockedByFriendsOnly) {
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

  const onPickMedia = async (file: File | undefined, kind: "image" | "video" | "file" | "audio") => {
    if (!file) return;
    setError("");
    const localId = `local-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const tempUrl = URL.createObjectURL(file);

    let label = "📷 Ảnh";
    if (kind === "video") label = "🎬 Video";
    else if (kind === "audio") label = "🎙️ Tin nhắn thoại";
    else if (kind === "file") label = `📁 ${file.name}`;

    setMessages((prev) => [
      ...prev,
      {
        id: localId,
        from: "me",
        text: label,
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
        if (isBlockedByFriendsOnly) {
          setStrangerBlocked(true);
        } else {
          setError("Không thể gửi tệp. Vui lòng thử lại.");
        }
        return;
      }
    }

    setUploading(kind === "image" || kind === "video" ? kind : null);
    try {
      const uploaded = await uploadsApi.file(file, kind);
      const publicUrl = uploaded.public_url;
      sendChatWs({
        type: "message.send",
        conversation_id: targetConvId,
        msg_type: kind,
        body: label,
        media_url: publicUrl,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload thất bại — kiểm tra kết nối");
    } finally {
      setUploading(null);
    }
  };

  const handleSendLocation = () => {
    if (!navigator.geolocation) {
      setError("Trình duyệt không hỗ trợ định vị GPS");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
        const text = `📍 Vị trí hiện tại: ${mapsUrl}`;
        void sendText(text, false);
      },
      (err) => {
        console.warn("Location error:", err);
        setError("Không thể lấy vị trí hiện tại. Vui lòng bật quyền định vị GPS.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSendGif = (gifUrl: string) => {
    setShowGifPicker(false);
    const localId = `local-${Date.now()}`;
    const createdAt = new Date().toISOString();

    setMessages((prev) => [
      ...prev,
      {
        id: localId,
        from: "me",
        text: "🎞️ GIF",
        msgType: "image",
        mediaUrl: gifUrl,
        time: formatTime(createdAt),
        createdAt,
      },
    ]);

    let targetConvId = currConversationId;
    if (!targetConvId) {
      void ensureConversation().then((id) => {
        if (id) {
          sendChatWs({
            type: "message.send",
            conversation_id: id,
            msg_type: "image",
            body: "🎞️ GIF",
            media_url: gifUrl,
          });
        }
      });
      return;
    }

    sendChatWs({
      type: "message.send",
      conversation_id: targetConvId,
      msg_type: "image",
      body: "🎞️ GIF",
      media_url: gifUrl,
    });
  };

  const startRecordingVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      setRecordingVoice(true);
      setRecordDuration(0);
      recordTimerRef.current = setInterval(() => {
        setRecordDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      setError("Không thể truy cập microphone. Vui lòng cấp quyền.");
    }
  };

  const stopAndSendVoice = () => {
    if (!mediaRecorderRef.current || !recordingVoice) return;
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    const recorder = mediaRecorderRef.current;
    recorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const file = new File([blob], `voice_${Date.now()}.webm`, { type: "audio/webm" });
      void onPickMedia(file, "audio");
    };
    recorder.stop();
    setRecordingVoice(false);
    setRecordDuration(0);
  };

  const cancelVoiceRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecordingVoice(false);
    setRecordDuration(0);
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
      setError("Hủy tương hợp thất bại. Vui lòng thử lại.");
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
            online={isFriendEffective && (peer.privacy?.show_online !== false) && peerOnline}
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
              if (!isFriendEffective) {
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
              if (peerCallPerm === "friends" && !isFriendEffective && !isMatched) {
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
              if (peerCallPerm === "friends" && !isFriendEffective && !isMatched) {
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

          {/* Menu / Info Drawer Options Button */}
          <button
            type="button"
            onClick={() => setShowInfoDrawer(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10 cursor-pointer"
            style={{ backgroundColor: "#1a1d2e", color: "#a0a8c8" }}
            title="Thông tin hội thoại"
            aria-label="Thông tin hội thoại"
          >
            ⋮
          </button>
        </div>
      </div>

      {/* Incoming Friend Request Action Banner */}
      {receivedRequest && !isFriendEffective && (
        <div
          className="flex-shrink-0 px-4 py-3 flex items-center justify-between gap-3 border-b animate-fade-in"
          style={{
            backgroundColor: "rgba(108, 99, 255, 0.12)",
            borderBottomColor: "rgba(108, 99, 255, 0.3)",
          }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: "#9b94ff" }}>
              <span>👋</span> {peer.name} đã gửi lời mời kết bạn
            </p>
            {receivedRequest.message && (
              <p className="text-[11px] text-gray-300 truncate mt-0.5 italic">
                &ldquo;{receivedRequest.message}&rdquo;
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              disabled={handlingFriendRequest}
              onClick={handleRejectFriendRequest}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
            >
              Từ chối
            </button>
            <button
              type="button"
              disabled={handlingFriendRequest}
              onClick={handleAcceptFriendRequest}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95 cursor-pointer flex items-center gap-1 shadow-md disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #6c63ff, #5b54e8)" }}
            >
              {handlingFriendRequest ? "Đang xử lý..." : "Đồng ý"}
            </button>
          </div>
        </div>
      )}

      {/* Outgoing Friend Request or Add Friend Button */}
      {!receivedRequest && !isFriendEffective && !isMatched && (
        <button
          type="button"
          onClick={friendRequested ? undefined : handleAddFriend}
          disabled={friendRequested}
          className={`w-full py-2.5 px-4 flex items-center justify-center gap-2 text-xs font-semibold transition-colors ${friendRequested ? "cursor-default opacity-85" : "cursor-pointer hover:bg-[#22263d]"
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

      {/* Matched Banner */}
      {!receivedRequest && isMatched && !isFriendEffective && (
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
              {friendRequested
                ? "Đã gửi lời mời kết bạn, đang chờ đối phương phản hồi"
                : "Kết bạn để xem toàn bộ bài viết & chia sẻ khoảnh khắc"}
            </p>
          </div>
          {friendRequested ? (
            <span className="text-xs px-3 py-1.5 rounded-xl bg-white/5 text-indigo-300 font-semibold">
              Đã gửi lời mời
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
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
          )}
        </div>
      )}

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col"
        onClick={() => setMenuMsgId(null)}
      >
        {/* Loading older messages indicator */}
        {loadingMore && (
          <div className="py-2.5 flex items-center justify-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-[#6c63ff] border-t-transparent animate-spin" />
            <span className="text-xs font-medium" style={{ color: "#8a94b8" }}>
              Đang tải tin nhắn cũ hơn...
            </span>
          </div>
        )}

        {!hasMore && messages.length > 0 && (
          <div className="py-3 text-center">
            <span
              className="text-[11px] px-3 py-1 rounded-full inline-block font-medium"
              style={{
                backgroundColor: "rgba(22, 25, 41, 0.7)",
                color: "#6b74a0",
                border: "1px solid rgba(30, 34, 64, 0.6)",
              }}
            >
              Đầu cuộc trò chuyện
            </span>
          </div>
        )}

        {messages.length === 0 && !initialLoading && (
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

        {(() => {
          return messages.map((msg, i) => {
            const prev = messages[i - 1];
            const next = messages[i + 1];

            const msgTime = msg.createdAt ? new Date(msg.createdAt).getTime() : 0;
            const prevTime = prev?.createdAt ? new Date(prev.createdAt).getTime() : 0;
            const nextTime = next?.createdAt ? new Date(next.createdAt).getTime() : 0;

            // 1. Date Divider or Time Gap Divider
            let dateDivider: string | null = null;
            let timeDivider: string | null = null;

            if (i === 0 && msg.createdAt) {
              dateDivider = formatDateDivider(msg.createdAt);
            } else if (prev && msg.createdAt && prev.createdAt) {
              const prevDate = new Date(prev.createdAt);
              const currDate = new Date(msg.createdAt);
              const isDifferentDay =
                prevDate.getFullYear() !== currDate.getFullYear() ||
                prevDate.getMonth() !== currDate.getMonth() ||
                prevDate.getDate() !== currDate.getDate();

              if (isDifferentDay) {
                dateDivider = formatDateDivider(msg.createdAt);
              } else if (msgTime - prevTime > 20 * 60 * 1000) {
                timeDivider = formatTime(msg.createdAt);
              }
            }

            // 2. Grouping
            const isSameSenderAsPrev =
              !dateDivider &&
              !timeDivider &&
              Boolean(prev && prev.from === msg.from && msgTime - prevTime < 5 * 60 * 1000);

            const isSameSenderAsNext = (() => {
              if (!next || next.from !== msg.from || !next.createdAt || !msg.createdAt) return false;
              const nextDate = new Date(next.createdAt);
              const currDate = new Date(msg.createdAt);
              const isNextDiffDay =
                nextDate.getFullYear() !== currDate.getFullYear() ||
                nextDate.getMonth() !== currDate.getMonth() ||
                nextDate.getDate() !== currDate.getDate();
              if (isNextDiffDay) return false;
              if (nextTime - msgTime >= 20 * 60 * 1000) return false;
              return nextTime - msgTime < 5 * 60 * 1000;
            })();

            const isFirstInGroup = !isSameSenderAsPrev;
            const isLastInGroup = !isSameSenderAsNext;
            const showAvatar = isLastInGroup;
            const isLastReadableMine = msg.id === lastReadableMineId;

            return (
              <div key={msg.id} className={`flex flex-col ${isLastInGroup ? "mb-3" : "mb-1"}`}>
                {dateDivider && <DateSeparator label={dateDivider} />}
                {timeDivider && <TimeSeparator time={timeDivider} />}
                <MessageBubble
                  msg={msg}
                  peer={peer}
                  isFirstInGroup={isFirstInGroup}
                  isLastInGroup={isLastInGroup}
                  showAvatar={showAvatar}
                  showRead={isLastReadableMine}
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
              </div>
            );
          });
        })()}

        {typing && (
          <div className="flex items-end gap-2 mb-2">
            <div className="w-7 h-7 flex-shrink-0 mb-1">
              <Avatar
                initials={peer.avatar}
                userId={peer.id}
                photoUrl={peer.photoUrl}
                size="xs"
                className="rounded-full"
              />
            </div>
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

      {/* GIF Picker Overlay */}
      {showGifPicker && (
        <div
          className="mx-4 mb-2 p-3 rounded-2xl bg-[#111320] border border-[#1e2240] shadow-2xl slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
            <span className="text-xs font-bold text-pink-400 flex items-center gap-1.5">
              <span>🎞️</span> Ảnh động GIF thịnh hành
            </span>
            <button
              type="button"
              onClick={() => setShowGifPicker(false)}
              className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
            {[
              { label: "Chào 👋", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1bWcydHB4cTBvdDZ2NXQ2bXRycmswNnhxbDFiaG50eGJ1Znl5dSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/mG246P4l2807f7oN7v/giphy.gif" },
              { label: "Tim ❤️", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeGJ0bjBwbWZ4dXkybm8wazJuc2l6c3JxcTVncmR4OXp6bXlzNmYxcyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/M90mJvfWfd5mbUuULX/giphy.gif" },
              { label: "Haha 😂", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNG11eW03dXRrMTMxaThxMHpvbHBiMmJ1OWxvbzM2OXA4bHpnN2V2NSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xr9AQyxLtjlx4297Nm/giphy.gif" },
              { label: "Wow 😮", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExc2phbzFmY3E5c3h5czQ4OXNudTFubHBzYnZ5d2p6d2V4dmdtZmF2YiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/5VKbvrjxpVJCM/giphy.gif" },
              { label: "OK 👍", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeHdybnEydmRseGR5NWtxd3h6MGZ1Ynk0Z2N6bjh2dW5jY25hM2c5eSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/111ebonMs90YLu/giphy.gif" },
              { label: "Vỗ tay 👏", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcnQ4Znprb3VrcXZ0YmFnbGtxanpjaHN6YWF1NHBwbXpqbzcxOWl6MSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/artj92V8o75VPL7AeQ/giphy.gif" },
              { label: "Tỏa sáng ✨", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcHN1a2R0MmVrcWNpMTYyNHdvcTJ1cnU1NWZ5a3U0aTJtdHNmaWF0bSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/26ufdipQqU2lhNA4g/giphy.gif" },
              { label: "Buồn 😢", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDVrdWppM3Mza2x6cGk2dDJjcmQycG53anlzd3Boc3FqZmsxd3Y2NSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/d2lcHJTG5Tscg/giphy.gif" },
            ].map((g, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendGif(g.url)}
                className="aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/5 hover:scale-105 transition-transform cursor-pointer group relative"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.url} alt={g.label} className="w-full h-full object-cover" />
                <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white text-center py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {g.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Slide-up Bottom Sheet for '+' Menu */}
      {showAttachMenu && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs animate-fade-in"
            onClick={() => setShowAttachMenu(false)}
          />
          <div
            className="fixed inset-x-0 bottom-0 z-50 bg-[#111320] border-t border-[#1e2240] rounded-t-3xl p-5 shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-base">✨</span>
                <h3 className="text-sm font-bold text-white tracking-wide">Tùy chọn đính kèm</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAttachMenu(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {/* 1. Tài liệu */}
              <button
                type="button"
                onClick={() => {
                  setShowAttachMenu(false);
                  fileInputRef.current?.click();
                }}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-[#161929] hover:bg-[#1f233a] border border-[#1e2240] hover:border-indigo-500/50 transition-all group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-md">
                  📁
                </div>
                <span className="text-xs font-semibold text-gray-200">Tài liệu</span>
              </button>

              {/* 2. Vị trí */}
              <button
                type="button"
                onClick={() => {
                  setShowAttachMenu(false);
                  handleSendLocation();
                }}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-[#161929] hover:bg-[#1f233a] border border-[#1e2240] hover:border-emerald-500/50 transition-all group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-md">
                  📍
                </div>
                <span className="text-xs font-semibold text-gray-200">Vị trí</span>
              </button>

              {/* 3. GIF */}
              <button
                type="button"
                onClick={() => {
                  setShowAttachMenu(false);
                  setShowGifPicker(true);
                }}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-[#161929] hover:bg-[#1f233a] border border-[#1e2240] hover:border-pink-500/50 transition-all group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-pink-500/15 text-pink-400 flex items-center justify-center text-base font-black group-hover:scale-110 transition-transform shadow-md">
                  GIF
                </div>
                <span className="text-xs font-semibold text-gray-200">Ảnh GIF</span>
              </button>

              {/* 4. Voice */}
              <button
                type="button"
                onClick={() => {
                  setShowAttachMenu(false);
                  void startRecordingVoice();
                }}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-[#161929] hover:bg-[#1f233a] border border-[#1e2240] hover:border-rose-500/50 transition-all group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-md">
                  🎙️
                </div>
                <span className="text-xs font-semibold text-gray-200">Ghi âm</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Bottom Chat Bar */}
      <div
        className="w-full flex-shrink-0 px-4 py-3 flex items-center gap-2 relative border-t border-[#1e2240] bg-[#0d0f1a]"
      >
        {/* Hidden inputs */}
        <input
          ref={mediaInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const isVideo = file.type.startsWith("video/");
              void onPickMedia(file, isVideo ? "video" : "image");
            }
            e.target.value = "";
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z,.tar,.gz,.csv,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              void onPickMedia(file, "file");
            }
            e.target.value = "";
          }}
        />

        {/* NÚT 1: Media Gallery (Ảnh & Video) */}
        <button
          type="button"
          onClick={() => mediaInputRef.current?.click()}
          disabled={!!uploading || recordingVoice}
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors hover:bg-white/10 disabled:opacity-40"
          style={{ backgroundColor: "#1a1d2e", color: "#a0a8c8" }}
          title="Thư viện ảnh & video"
          aria-label="Thư viện ảnh & video"
        >
          <svg width="19" height="19" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </button>

        {/* NÚT 2: ☺ Emoji */}
        <button
          type="button"
          onClick={() => {
            setShowEmoji((v) => !v);
            setShowAttachMenu(false);
            setShowGifPicker(false);
          }}
          disabled={recordingVoice}
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg cursor-pointer transition-colors disabled:opacity-40"
          style={{
            backgroundColor: showEmoji ? "rgba(108,99,255,0.2)" : "#1a1d2e",
            color: showEmoji ? "#9b94ff" : "#a0a8c8",
          }}
          title="Biểu cảm Emoji"
          aria-label="Biểu cảm Emoji"
        >
          ☺
        </button>

        {/* NÚT 3: Nút '+' mở menu (Tài liệu, Vị trí, GIF, Voice) */}
        <button
          type="button"
          onClick={() => {
            setShowAttachMenu((v) => !v);
            setShowEmoji(false);
            setShowGifPicker(false);
          }}
          disabled={recordingVoice}
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 cursor-pointer transition-all hover:bg-white/10 disabled:opacity-40"
          style={{
            backgroundColor: showAttachMenu ? "rgba(108,99,255,0.25)" : "#1a1d2e",
            color: showAttachMenu ? "#9b94ff" : "#a0a8c8",
          }}
          title="Đính kèm & Mở rộng (+)"
          aria-label="Đính kèm & Mở rộng"
        >
          <svg
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.2}
            className={`transition-transform duration-200 ${showAttachMenu ? "rotate-45" : ""}`}
          >
            <path d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* Input or Voice Recording Bar */}
        {recordingVoice ? (
          <div
            className="flex-1 flex items-center justify-between gap-3 px-4 py-2 rounded-2xl animate-fade-in"
            style={{ backgroundColor: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)" }}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-bold text-red-400">Đang ghi âm</span>
              <span className="text-xs font-mono text-gray-300">
                {Math.floor(recordDuration / 60)
                  .toString()
                  .padStart(2, "0")}
                :{(recordDuration % 60).toString().padStart(2, "0")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelVoiceRecording}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-xs cursor-pointer"
                title="Hủy ghi âm"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={stopAndSendVoice}
                className="px-3 py-1 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold text-xs shadow-md hover:opacity-90 transition-opacity cursor-pointer"
              >
                Gửi voice
              </button>
            </div>
          </div>
        ) : (
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
        )}

        {!recordingVoice && (
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
        )}
      </div>

      {/* Slide-over Info Drawer */}
      <ChatInfoDrawer
        isOpen={showInfoDrawer}
        onClose={() => setShowInfoDrawer(false)}
        peer={peer}
        peerOnline={peerOnline}
        peerLastSeenAt={peerLastSeenAt}
        isFriend={isFriendEffective}
        isMatched={isMatched}
        messages={messages}
        onStartCall={(callType) => {
          let targetConvId = currConversationId;
          if (!targetConvId) {
            void ensureConversation().then((id) => {
              if (!id) {
                setError("Không thể khởi tạo cuộc gọi");
                return;
              }
              void startCall({
                conversationId: id,
                targetUserId: peer.id,
                callType,
                peer: {
                  id: peer.id,
                  name: peer.name,
                  avatar: peer.avatar,
                  photoUrl: peer.photoUrl,
                },
              });
            });
            return;
          }
          void startCall({
            conversationId: targetConvId,
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
        onUnfriendClick={() => setShowUnfriendModal(true)}
        onUnmatchClick={() => setShowUnmatchModal(true)}
      />

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

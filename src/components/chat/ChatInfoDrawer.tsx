"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import type { ChatMessage, NearbyUser } from "@/lib/types";

interface ChatInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  peer: NearbyUser;
  peerOnline: boolean;
  peerLastSeenAt: string | null;
  isFriend: boolean;
  isMatched: boolean;
  messages: ChatMessage[];
  onStartCall: (callType: "audio" | "video") => void;
  onUnfriendClick: () => void;
  onUnmatchClick: () => void;
}

interface SharedMediaItem {
  id: string;
  type: "image" | "video";
  url: string;
  time: string;
  createdAt?: string;
}

interface SharedFileItem {
  id: string;
  name: string;
  url: string;
  extension: string;
  time: string;
}

interface SharedLinkItem {
  id: string;
  url: string;
  domain: string;
  time: string;
}

const URL_REGEX = /https?:\/\/[^\s<>"'()]+/gi;
const FILE_EXT_REGEX = /\.(pdf|docx?|xlsx?|pptx?|txt|zip|rar|7z|tar|gz|csv|json|apk|dmg|iso|mp3|wav|ogg)$/i;
const IMAGE_EXT_REGEX = /\.(jpe?g|png|webp|gif|svg|avif|bmp)$/i;
const VIDEO_EXT_REGEX = /\.(mp4|webm|mov|m4v|ogg|ogv|mkv)$/i;

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

  if (diffMin < 1) return "Vừa mới truy cập";
  if (diffMin < 60) return `Truy cập ${diffMin} phút trước`;
  if (diffHours < 24) return `Truy cập ${diffHours} giờ trước`;
  if (diffDays < 30) return `Truy cập ${diffDays} ngày trước`;
  return `Truy cập ngày ${date.toLocaleDateString("vi-VN")}`;
}

function getFileNameFromUrl(url: string): string {
  try {
    const cleanUrl = url.split("?")[0];
    const parts = cleanUrl.split("/");
    const last = parts[parts.length - 1];
    return decodeURIComponent(last) || "Tệp tin";
  } catch {
    return "Tệp tin";
  }
}

function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  if (parts.length > 1) {
    return parts[parts.length - 1].toUpperCase();
  }
  return "FILE";
}

export default function ChatInfoDrawer({
  isOpen,
  onClose,
  peer,
  peerOnline,
  peerLastSeenAt,
  isFriend,
  isMatched,
  messages,
  onStartCall,
  onUnfriendClick,
  onUnmatchClick,
}: ChatInfoDrawerProps) {
  const router = useRouter();
  const [activeMediaTab, setActiveMediaTab] = useState<"all" | "image" | "video">("all");
  const [previewMedia, setPreviewMedia] = useState<SharedMediaItem | null>(null);

  // 1. Shared Photos & Videos
  const sharedMedia = useMemo<SharedMediaItem[]>(() => {
    const list: SharedMediaItem[] = [];
    messages.forEach((msg) => {
      if (msg.recalled) return;
      const url = msg.mediaUrl;
      if (msg.msgType === "image" && url) {
        list.push({ id: msg.id, type: "image", url, time: msg.time, createdAt: msg.createdAt });
      } else if (msg.msgType === "video" && url) {
        list.push({ id: msg.id, type: "video", url, time: msg.time, createdAt: msg.createdAt });
      } else if (url) {
        if (IMAGE_EXT_REGEX.test(url)) {
          list.push({ id: msg.id, type: "image", url, time: msg.time, createdAt: msg.createdAt });
        } else if (VIDEO_EXT_REGEX.test(url)) {
          list.push({ id: msg.id, type: "video", url, time: msg.time, createdAt: msg.createdAt });
        }
      }
    });
    return list;
  }, [messages]);

  const filteredMedia = useMemo(() => {
    if (activeMediaTab === "all") return sharedMedia;
    return sharedMedia.filter((m) => m.type === activeMediaTab);
  }, [sharedMedia, activeMediaTab]);

  // 2. Shared Files
  const sharedFiles = useMemo<SharedFileItem[]>(() => {
    const list: SharedFileItem[] = [];
    messages.forEach((msg) => {
      if (msg.recalled) return;
      const url = msg.mediaUrl;
      if (url && FILE_EXT_REGEX.test(url)) {
        const name = getFileNameFromUrl(url);
        list.push({
          id: msg.id,
          name,
          url,
          extension: getFileExtension(name),
          time: msg.time,
        });
      }
    });
    return list;
  }, [messages]);

  // 3. Shared Links
  const sharedLinks = useMemo<SharedLinkItem[]>(() => {
    const list: SharedLinkItem[] = [];
    messages.forEach((msg) => {
      if (msg.recalled || !msg.text) return;
      const matches = msg.text.match(URL_REGEX);
      if (matches) {
        matches.forEach((url, idx) => {
          try {
            const parsed = new URL(url);
            list.push({
              id: `${msg.id}-${idx}`,
              url,
              domain: parsed.hostname.replace(/^www\./, ""),
              time: msg.time,
            });
          } catch {
            list.push({
              id: `${msg.id}-${idx}`,
              url,
              domain: "Liên kết",
              time: msg.time,
            });
          }
        });
      }
    });
    return list;
  }, [messages]);

  if (!isOpen) return null;

  const showOnline = isFriend && peer.privacy?.show_online !== false;
  const isOnlineStatus = showOnline && peerOnline;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Drawer from Right */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] max-w-full bg-[#0d0f1a] border-l border-[#1e2240] shadow-2xl flex flex-col text-[#e8eaf2] transform transition-transform duration-300 ease-out animate-slide-left overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2240] bg-[#111320]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">ℹ️</span>
            <h2 className="text-base font-bold text-white tracking-wide">Thông tin hội thoại</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Đóng"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* PHẦN 1: THÔNG TIN USER */}
          <div className="flex flex-col items-center text-center p-4 rounded-3xl bg-[#141729] border border-[#1e2240] shadow-sm relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Avatar */}
            <div className="relative mb-3">
              <Avatar
                initials={peer.avatar}
                userId={peer.id}
                size="xl"
                online={isOnlineStatus}
                photoUrl={peer.photoUrl}
                className="w-20 h-20 text-2xl ring-4 ring-[#1e2240] shadow-lg"
              />
            </div>

            {/* Name */}
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
              {peer.name}
            </h3>

            {/* Tags & Status */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1.5">
              {peer.age ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                  {peer.age} tuổi
                </span>
              ) : null}
              {peer.gender ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-pink-500/15 text-pink-300 border border-pink-500/20">
                  {peer.gender === "woman" ? "Nữ ♀" : peer.gender === "man" ? "Nam ♂" : peer.gender}
                </span>
              ) : null}
              {peer.distanceKm != null ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                  📍 {peer.distanceKm < 1 ? "< 1 km" : `${peer.distanceKm.toFixed(1)} km`}
                </span>
              ) : null}
            </div>

            {/* Last active status */}
            <div className="mt-2 text-xs font-medium text-gray-400 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isOnlineStatus ? "bg-emerald-400 animate-pulse" : "bg-gray-500"}`} />
              <span>{isOnlineStatus ? "Đang hoạt động" : formatLastSeen(peerLastSeenAt)}</span>
            </div>

            {/* Bio / Status */}
            {(peer.bio || peer.status) && (
              <p className="mt-3 text-xs text-gray-300 italic px-3 py-2 rounded-xl bg-white/5 border border-white/5 w-full text-center line-clamp-3">
                &ldquo;{peer.bio || peer.status}&rdquo;
              </p>
            )}

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-3 gap-2 w-full mt-4 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push(`/wall/${peer.id}`);
                }}
                className="flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-2xl bg-[#1a1d2e] hover:bg-[#23273e] text-indigo-300 transition-colors cursor-pointer text-xs font-semibold"
                title="Xem trang cá nhân"
              >
                <span className="text-base">👤</span>
                <span className="text-[11px]">Trang cá nhân</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartCall("audio");
                }}
                className="flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-2xl bg-[#1a1d2e] hover:bg-[#23273e] text-emerald-400 transition-colors cursor-pointer text-xs font-semibold"
                title="Gọi thoại"
              >
                <span className="text-base">📞</span>
                <span className="text-[11px]">Gọi thoại</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartCall("video");
                }}
                className="flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-2xl bg-[#1a1d2e] hover:bg-[#23273e] text-cyan-400 transition-colors cursor-pointer text-xs font-semibold"
                title="Gọi video"
              >
                <span className="text-base">📹</span>
                <span className="text-[11px]">Gọi video</span>
              </button>
            </div>
          </div>

          {/* PHẦN 2: ẢNH VÀ VIDEO CHUNG */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">🖼️</span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Ảnh & Video chung
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1a1d2e] text-indigo-300 border border-[#1e2240]">
                  {sharedMedia.length}
                </span>
              </div>

              {sharedMedia.length > 0 && (
                <div className="flex items-center gap-1 bg-[#141729] p-0.5 rounded-xl border border-[#1e2240] text-[10px] font-medium">
                  <button
                    type="button"
                    onClick={() => setActiveMediaTab("all")}
                    className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                      activeMediaTab === "all" ? "bg-indigo-600 text-white font-bold" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMediaTab("image")}
                    className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                      activeMediaTab === "image" ? "bg-indigo-600 text-white font-bold" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Ảnh
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMediaTab("video")}
                    className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                      activeMediaTab === "video" ? "bg-indigo-600 text-white font-bold" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Video
                  </button>
                </div>
              )}
            </div>

            {filteredMedia.length === 0 ? (
              <div className="p-5 rounded-2xl bg-[#141729] border border-[#1e2240] text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-1.5">
                <span className="text-2xl opacity-40">🌅</span>
                <p>Chưa có ảnh hoặc video nào được gửi</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 rounded-2xl p-2.5 bg-[#141729] border border-[#1e2240] max-h-56 overflow-y-auto">
                {filteredMedia.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setPreviewMedia(item)}
                    className="relative aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/5 group cursor-pointer hover:opacity-90 hover:scale-[1.02] transition-all"
                  >
                    {item.type === "image" ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={item.url}
                        alt="Ảnh chia sẻ"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#1a1d2e] relative">
                        <video src={item.url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white text-xs">
                            ▶
                          </div>
                        </div>
                      </div>
                    )}
                    <span className="absolute bottom-1 right-1 text-[9px] px-1 py-0.5 rounded bg-black/60 backdrop-blur-sm text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PHẦN 3: FILE CHUNG */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm">📁</span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                File & Tài liệu chung
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1a1d2e] text-indigo-300 border border-[#1e2240]">
                {sharedFiles.length}
              </span>
            </div>

            {sharedFiles.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#141729] border border-[#1e2240] text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-1.5">
                <span className="text-2xl opacity-40">📄</span>
                <p>Chưa có tệp tin hoặc tài liệu nào</p>
              </div>
            ) : (
              <div className="space-y-2 rounded-2xl p-2 bg-[#141729] border border-[#1e2240] max-h-48 overflow-y-auto">
                {sharedFiles.map((file) => (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-[#1a1d2e] hover:bg-[#23273e] transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                      {file.extension}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate group-hover:text-indigo-300 transition-colors">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{file.time}</p>
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-white transition-colors flex-shrink-0">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* PHẦN 4: LINK CHUNG */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm">🔗</span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Link liên kết chung
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1a1d2e] text-indigo-300 border border-[#1e2240]">
                {sharedLinks.length}
              </span>
            </div>

            {sharedLinks.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#141729] border border-[#1e2240] text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-1.5">
                <span className="text-2xl opacity-40">🌐</span>
                <p>Chưa có liên kết nào được chia sẻ</p>
              </div>
            ) : (
              <div className="space-y-2 rounded-2xl p-2 bg-[#141729] border border-[#1e2240] max-h-48 overflow-y-auto">
                {sharedLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-[#1a1d2e] hover:bg-[#23273e] transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm flex-shrink-0">
                      🌐
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-cyan-300 truncate">
                        {link.domain}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        {link.url}
                      </p>
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-white transition-colors flex-shrink-0">
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6m4-3h6v6m-11 5L21 3" />
                      </svg>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* PHẦN 5: HÀNH ĐỘNG / HỦY BẠN & HỦY TƯƠNG HỢP */}
          <div className="pt-2 space-y-2.5 border-t border-[#1e2240]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Tùy chọn & Quản lý
            </h4>

            {isFriend && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onUnfriendClick();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 text-amber-400 font-semibold text-xs transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">👥</span>
                  <div className="text-left">
                    <p className="text-amber-300">Hủy kết bạn</p>
                    <p className="text-[10px] text-amber-400/70 font-normal">Xóa khỏi danh sách bạn bè</p>
                  </div>
                </div>
                <span className="text-amber-400">→</span>
              </button>
            )}

            {isMatched && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onUnmatchClick();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 text-rose-400 font-semibold text-xs transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">💔</span>
                  <div className="text-left">
                    <p className="text-rose-300">Hủy tương hợp</p>
                    <p className="text-[10px] text-rose-400/70 font-normal">Kết thúc ghép đôi hẹn hò</p>
                  </div>
                </div>
                <span className="text-rose-400">→</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Modal for Shared Media Preview */}
      {previewMedia && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewMedia(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewMedia(null)}
              className="absolute -top-10 right-0 p-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
              title="Đóng xem trước"
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {previewMedia.type === "image" ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={previewMedia.url}
                alt="Xem ảnh lớn"
                className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl border border-white/10"
              />
            ) : (
              <video
                src={previewMedia.url}
                controls
                autoPlay
                className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl border border-white/10"
              />
            )}

            <div className="mt-3 flex items-center gap-3">
              <a
                href={previewMedia.url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg"
              >
                <span>Tải xuống</span>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

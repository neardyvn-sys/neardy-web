"use client";

import { useState, useRef, useEffect } from "react";
import Avatar from "@/components/ui/Avatar";
import { initialsFromName } from "@/lib/types";

export interface CandidateUser {
  id: string;
  display_name: string;
  bio: string | null;
  gender: string | null;
  age: number | null;
  distance_km: number | null;
  primary_photo: string | null;
  photos?: string[];
  show_online?: boolean;
  online?: boolean;
}

interface SwipeDeckProps {
  candidates: CandidateUser[];
  onSwipe: (user: CandidateUser, action: "like" | "pass" | "superlike") => void;
  onRefresh?: () => void;
}

export default function SwipeDeck({ candidates, onSwipe, onRefresh }: SwipeDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0, time: 0 });

  const activeUser = candidates[currentIndex];
  const nextUser = candidates[currentIndex + 1];

  const activePhotos = (activeUser?.photos && activeUser.photos.length > 0)
    ? activeUser.photos
    : (activeUser?.primary_photo ? [activeUser.primary_photo] : []);
  const currentPhoto = activePhotos[currentPhotoIndex] || activeUser?.primary_photo;

  const nextPhotos = (nextUser?.photos && nextUser.photos.length > 0)
    ? nextUser.photos
    : (nextUser?.primary_photo ? [nextUser.primary_photo] : []);
  const nextPrimaryPhoto = nextPhotos[0] || nextUser?.primary_photo;

  // Reset photo index when switching candidate
  useEffect(() => {
    setCurrentPhotoIndex(0);
  }, [currentIndex]);

  const resetPosition = () => {
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const triggerAction = (action: "like" | "pass" | "superlike") => {
    if (!activeUser) return;

    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      window.navigator.vibrate(40);
    }

    onSwipe(activeUser, action);
    setHistory((prev) => [...prev, currentIndex]);
    setCurrentIndex((prev) => prev + 1);
    resetPosition();
  };

  const triggerRewind = () => {
    if (history.length === 0) return;

    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      window.navigator.vibrate(30);
    }

    const prevIndex = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setCurrentIndex(prevIndex);
    resetPosition();
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentPhotoIndex > 0) {
      if (typeof window !== "undefined" && window.navigator?.vibrate) {
        window.navigator.vibrate(15);
      }
      setCurrentPhotoIndex((prev) => prev - 1);
    }
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentPhotoIndex < activePhotos.length - 1) {
      if (typeof window !== "undefined" && window.navigator?.vibrate) {
        window.navigator.vibrate(15);
      }
      setCurrentPhotoIndex((prev) => prev + 1);
    }
  };

  const handleTouchStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    startPos.current = { x: clientX, y: clientY, time: Date.now() };
  };

  const handleTouchMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const deltaX = clientX - startPos.current.x;
    const deltaY = clientY - startPos.current.y;
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    const threshold = 90;

    if (dragOffset.x > threshold) {
      triggerAction("like");
    } else if (dragOffset.x < -threshold) {
      triggerAction("pass");
    } else if (dragOffset.y < -threshold) {
      triggerAction("superlike");
    } else {
      resetPosition();
    }
  };

  // Rotation angle calculation based on horizontal drag distance
  const rotateDeg = Math.min(Math.max(dragOffset.x / 12, -25), 25);

  // Active Badge Opacities
  const likeOpacity = Math.min(Math.max(dragOffset.x / 100, 0), 1);
  const passOpacity = Math.min(Math.max(-dragOffset.x / 100, 0), 1);
  const superLikeOpacity = Math.min(Math.max(-dragOffset.y / 100, 0), 1);

  if (currentIndex >= candidates.length || !activeUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-[#111320] border border-[#1e2240] flex items-center justify-center text-4xl shadow-xl">
          💫
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">Đã xem hết gợi ý ghép đôi!</h3>
          <p className="text-xs text-gray-400 max-w-xs">
            Hãy quay lại sau hoặc mở rộng bộ lọc tìm kiếm để khám phá thêm nhiều bạn mới.
          </p>
        </div>
        {onRefresh && (
          <button
            onClick={() => {
              setCurrentIndex(0);
              onRefresh();
            }}
            className="mt-2 px-5 py-2.5 rounded-full font-bold text-sm bg-gradient-to-r from-[#ff4b72] to-[#6c63ff] text-white shadow-lg hover:opacity-90 transition-all active:scale-95 cursor-pointer"
          >
            🔄 Tải lại thẻ mới
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full px-4 py-1 select-none">
      {/* Card Deck Area */}
      <div className="relative w-full aspect-[3/4] max-h-[430px] flex items-center justify-center">
        {/* Next Card Background Stack */}
        {nextUser && (
          <div
            className="absolute inset-0 rounded-3xl bg-[#111320] border border-[#1e2240] overflow-hidden shadow-xl transform scale-[0.94] translate-y-3 opacity-60 pointer-events-none transition-all duration-300"
          >
            {nextPrimaryPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={nextPrimaryPhoto}
                alt=""
                className="w-full h-full object-cover filter brightness-75"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1e36] to-[#0f111f]">
                <Avatar initials={initialsFromName(nextUser.display_name)} size="xl" />
              </div>
            )}
          </div>
        )}

        {/* Active Draggable Card */}
        <div
          onMouseDown={(e) => handleTouchStart(e.clientX, e.clientY)}
          onMouseMove={(e) => handleTouchMove(e.clientX, e.clientY)}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
          onTouchStart={(e) => handleTouchStart(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={(e) => handleTouchMove(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0px) rotate(${rotateDeg}deg)`,
            transition: isDragging ? "none" : "transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            cursor: isDragging ? "grabbing" : "grab",
          }}
          className="absolute inset-0 rounded-3xl bg-[#111320] border border-[#1e2240] overflow-hidden shadow-2xl flex flex-col justify-end"
        >
          {/* Main Photo / Avatar Background */}
          {currentPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={currentPhoto}
              src={currentPhoto}
              alt=""
              className="absolute inset-0 w-full h-full object-cover animate-fade-in"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#2a1d47] to-[#0d1021] flex items-center justify-center">
              <Avatar
                initials={initialsFromName(activeUser.display_name)}
                userId={activeUser.id}
                size="xl"
                className="w-32 h-32 text-4xl"
              />
            </div>
          )}

          {/* Segmented Story Bars (if candidate has multiple photos) */}
          {activePhotos.length > 1 && (
            <div className="absolute top-3 left-3 right-3 z-30 flex items-center gap-1.5 pointer-events-none">
              {activePhotos.map((_, idx) => (
                <div
                  key={idx}
                  className="h-1 flex-1 rounded-full overflow-hidden bg-black/40 backdrop-blur-sm transition-all"
                >
                  <div
                    className={`h-full transition-all duration-200 ${
                      idx === currentPhotoIndex
                        ? "bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]"
                        : idx < currentPhotoIndex
                        ? "bg-white/70"
                        : "bg-white/20"
                    }`}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Tap Zones to Change Photo (Left / Right) */}
          {activePhotos.length > 1 && (
            <div className="absolute inset-x-0 top-8 bottom-28 z-20 flex">
              <div
                onClick={handlePrevPhoto}
                className="w-1/2 h-full cursor-pointer"
                title="Ảnh trước"
              />
              <div
                onClick={handleNextPhoto}
                className="w-1/2 h-full cursor-pointer"
                title="Ảnh tiếp theo"
              />
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c14] via-[#0a0c14]/40 to-transparent" />

          {/* Swipe Badges */}
          {/* LIKE Badge */}
          <div
            style={{ opacity: likeOpacity }}
            className="absolute top-8 left-8 border-4 border-[#00e5ff] text-[#00e5ff] font-black text-2xl uppercase tracking-widest px-4 py-1 rounded-xl transform -rotate-12 bg-black/30 backdrop-blur-sm pointer-events-none transition-opacity"
          >
            LIKE 🩵
          </div>

          {/* PASS Badge */}
          <div
            style={{ opacity: passOpacity }}
            className="absolute top-8 right-8 border-4 border-[#ff4b72] text-[#ff4b72] font-black text-2xl uppercase tracking-widest px-4 py-1 rounded-xl transform rotate-12 bg-black/30 backdrop-blur-sm pointer-events-none transition-opacity"
          >
            PASS ❌
          </div>

          {/* SUPER LIKE Badge */}
          <div
            style={{ opacity: superLikeOpacity }}
            className="absolute bottom-32 left-1/2 -translate-x-1/2 border-4 border-[#ffd700] text-[#ffd700] font-black text-2xl uppercase tracking-widest px-4 py-1 rounded-xl bg-black/40 backdrop-blur-sm pointer-events-none transition-opacity"
          >
            SUPER LIKE ⭐
          </div>

          {/* User Profile Card Info */}
          <div className="relative z-10 p-5 space-y-2">
            <div className="flex items-baseline gap-2">
              <h2 className="text-2xl font-black text-white">{activeUser.display_name}</h2>
              {activeUser.age && (
                <span className="text-xl font-bold text-gray-300">{activeUser.age}</span>
              )}
              {activeUser.show_online && activeUser.online && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-[#00e5ff]/20 text-[#00e5ff] text-[10px] font-bold">
                  🟢 Online
                </span>
              )}
            </div>

            {activeUser.distance_km !== null && activeUser.distance_km !== undefined && (
              <p className="text-xs text-gray-300 flex items-center gap-1 font-medium">
                <span>📍</span> Cách bạn {activeUser.distance_km} km
              </p>
            )}

            {activeUser.bio && (
              <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed bg-black/30 backdrop-blur-md p-2.5 rounded-xl border border-white/10">
                {activeUser.bio}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Control Buttons */}
      <div className="flex items-center justify-center gap-4 pt-3 pb-1 w-full flex-shrink-0 z-10">
        {/* Rewind Button */}
        <button
          onClick={triggerRewind}
          disabled={history.length === 0}
          className={`w-11 h-11 rounded-full bg-[#171a2e] border-2 border-[#f59e0b]/50 flex items-center justify-center text-lg text-[#f59e0b] shadow-lg transition-all ${
            history.length === 0
              ? "opacity-30 cursor-not-allowed border-[#f59e0b]/20"
              : "hover:bg-[#f59e0b]/20 hover:scale-105 active:scale-90 cursor-pointer"
          }`}
          title="Hoàn tác thẻ trước đó (Rewind)"
        >
          ↩️
        </button>

        {/* Pass Button */}
        <button
          onClick={() => triggerAction("pass")}
          className="w-13 h-13 rounded-full bg-[#171a2e] border-2 border-[#ff4b72]/50 flex items-center justify-center text-2xl text-[#ff4b72] shadow-lg hover:bg-[#ff4b72]/20 hover:scale-105 active:scale-90 transition-all cursor-pointer"
          title="Bỏ qua (Swipe trái)"
        >
          ❌
        </button>

        {/* Super Like Button */}
        <button
          onClick={() => triggerAction("superlike")}
          className="w-11 h-11 rounded-full bg-[#171a2e] border-2 border-[#ffd700]/50 flex items-center justify-center text-lg text-[#ffd700] shadow-lg hover:bg-[#ffd700]/20 hover:scale-105 active:scale-90 transition-all cursor-pointer"
          title="Super Like (Swipe lên)"
        >
          ⭐
        </button>

        {/* Like Button */}
        <button
          onClick={() => triggerAction("like")}
          className="w-13 h-13 rounded-full bg-[#171a2e] border-2 border-[#00e5ff]/50 flex items-center justify-center text-2xl text-[#00e5ff] shadow-lg hover:bg-[#00e5ff]/20 hover:scale-105 active:scale-90 transition-all cursor-pointer"
          title="Thích (Swipe phải)"
        >
          🩵
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

export type MediaItem = {
  id?: string;
  type: "image" | "video" | string;
  url: string;
};

export default function ImageViewer({
  media,
  initialIndex = 0,
  open,
  onClose,
}: {
  media: MediaItem[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((i) => (i > 0 ? i - 1 : media.length - 1));
      if (e.key === "ArrowRight") setIndex((i) => (i < media.length - 1 ? i + 1 : 0));
    };
    window.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, media.length, onClose]);

  if (!open || !media.length) return null;

  const current = media[index] || media[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      {/* Top Bar */}
      <div
        className="absolute top-4 left-4 right-4 flex items-center justify-between z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "#e8eaf2" }}>
          {index + 1} / {media.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
          style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "#fff" }}
          aria-label="Đóng"
        >
          ✕
        </button>
      </div>

      {/* Main Content */}
      <div
        className="relative max-w-4xl max-h-[85vh] w-full h-full flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {current.type === "video" ? (
          <video
            src={current.url}
            controls
            autoPlay
            playsInline
            className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.url}
            alt=""
            className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
          />
        )}
      </div>

      {/* Nav Controls */}
      {media.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => (i > 0 ? i - 1 : media.length - 1));
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold z-10"
            style={{ backgroundColor: "rgba(255,255,255,0.18)", color: "#fff" }}
            aria-label="Ảnh trước"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => (i < media.length - 1 ? i + 1 : 0));
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold z-10"
            style={{ backgroundColor: "rgba(255,255,255,0.18)", color: "#fff" }}
            aria-label="Ảnh tiếp theo"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}

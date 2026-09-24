"use client";

import { useEffect, useRef, useState } from "react";

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
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragAxis, setDragAxis] = useState<"x" | "y" | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0, time: 0 });
  const lastMove = useRef({ x: 0, y: 0, time: 0 });
  const isPointerActive = useRef(false);

  useEffect(() => {
    setIndex(initialIndex);
    setDragX(0);
    setDragY(0);
  }, [initialIndex, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, media.length, onClose]);

  const handlePrev = () => {
    setIndex((i) => (i > 0 ? i - 1 : 0));
  };

  const handleNext = () => {
    setIndex((i) => (i < media.length - 1 ? i + 1 : media.length - 1));
  };

  if (!open || !media.length) return null;

  // Pointer / Touch Gestures
  const handlePointerDown = (e: React.PointerEvent) => {
    // If clicking a button or video native controls, don't start slide drag
    if ((e.target as HTMLElement).closest("button")) return;

    isPointerActive.current = true;
    startPos.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    lastMove.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    setIsDragging(true);
    setDragAxis(null);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerActive.current) return;

    const diffX = e.clientX - startPos.current.x;
    const diffY = e.clientY - startPos.current.y;

    let axis = dragAxis;
    // Lock direction after a small threshold
    if (!axis && (Math.abs(diffX) > 6 || Math.abs(diffY) > 6)) {
      axis = Math.abs(diffX) >= Math.abs(diffY) ? "x" : "y";
      setDragAxis(axis);
    }

    lastMove.current = { x: e.clientX, y: e.clientY, time: Date.now() };

    if (axis === "x") {
      // Horizontal slide: add rubber-band resistance at boundaries
      let resistance = 1;
      if ((index === 0 && diffX > 0) || (index === media.length - 1 && diffX < 0)) {
        resistance = 0.3;
      }
      setDragX(diffX * resistance);
      setDragY(0);
    } else if (axis === "y") {
      // Vertical pull-down to dismiss: allow downwards, resist upwards
      const yVal = diffY > 0 ? diffY : diffY * 0.2;
      setDragY(yVal);
      setDragX(0);
    }
  };

  const handlePointerUp = () => {
    if (!isPointerActive.current) return;
    isPointerActive.current = false;
    setIsDragging(false);

    const diffX = dragX;
    const diffY = dragY;
    const elapsed = Date.now() - startPos.current.time;
    const velocityX = Math.abs(diffX) / (elapsed || 1);
    const velocityY = Math.abs(diffY) / (elapsed || 1);

    const containerWidth = containerRef.current?.offsetWidth || window.innerWidth;
    const swipeThreshold = Math.min(containerWidth * 0.2, 80);

    if (dragAxis === "x") {
      if (diffX < -swipeThreshold || (diffX < -20 && velocityX > 0.35)) {
        // Next slide
        if (index < media.length - 1) {
          setIndex((i) => i + 1);
        }
      } else if (diffX > swipeThreshold || (diffX > 20 && velocityX > 0.35)) {
        // Prev slide
        if (index > 0) {
          setIndex((i) => i - 1);
        }
      }
    } else if (dragAxis === "y") {
      // Pull down to dismiss
      if (diffY > 110 || (diffY > 40 && velocityY > 0.4)) {
        onClose();
        return;
      }
    }

    setDragX(0);
    setDragY(0);
    setDragAxis(null);
  };

  const isDismissing = dragAxis === "y" && dragY > 0;
  const backdropOpacity = isDismissing ? Math.max(0.15, 1 - dragY / 400) : 1;

  // Outer stage handles vertical pull-down dismiss and scale
  const stageTransform = isDismissing
    ? `translate3d(0, ${dragY}px, 0) scale(${Math.max(0.78, 1 - dragY / 1100)})`
    : "translate3d(0, 0, 0) scale(1)";

  const stageTransition = isDragging
    ? "none"
    : "transform 0.28s cubic-bezier(0.25, 1, 0.5, 1)";

  // Inner track only handles horizontal slide translation
  const trackTransform = `translate3d(calc(-${index * 100}% + ${dragX}px), 0, 0)`;
  const trackTransition = isDragging
    ? "none"
    : "transform 0.32s cubic-bezier(0.25, 1, 0.5, 1)";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between select-none overflow-hidden touch-none"
      style={{
        backgroundColor: `rgba(0, 0, 0, ${0.94 * backdropOpacity})`,
        backdropFilter: `blur(${8 * backdropOpacity}px)`,
        transition: isDragging ? "none" : "background-color 0.25s ease",
      }}
      onClick={onClose}
    >
      {/* Top Bar */}
      <div
        className="relative z-30 flex items-center justify-between p-4 flex-shrink-0 transition-opacity"
        style={{ opacity: backdropOpacity }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-bold px-3 py-1.5 rounded-full shadow-lg"
            style={{
              backgroundColor: "rgba(255,255,255,0.15)",
              color: "#ffffff",
              backdropFilter: "blur(6px)",
            }}
          >
            {index + 1} / {media.length}
          </span>
          <span className="hidden sm:inline text-[11px] text-white/60">
            (Vuốt trái/phải chuyển ảnh · Kéo xuống để đóng)
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-base text-white shadow-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          style={{ backgroundColor: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)" }}
          aria-label="Đóng"
        >
          ✕
        </button>
      </div>

      {/* Continuous Multi-Slide Track Container */}
      <div
        ref={containerRef}
        className="flex-1 w-full relative flex items-center min-h-0 overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          transform: stageTransform,
          transition: stageTransition,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Horizontal Continuous Track */}
        <div
          className="flex w-full h-full will-change-transform"
          style={{
            transform: trackTransform,
            transition: trackTransition,
          }}
        >
          {media.map((item, idx) => (
            <div
              key={item.id || `${item.url}-${idx}`}
              className="w-full h-full flex-shrink-0 flex items-center justify-center p-3 sm:p-6 box-border transition-opacity"
              style={{
                width: "100%",
                height: "100%",
                opacity: isDismissing && idx !== index ? 0 : 1,
              }}
            >
              {item.type === "video" ? (
                <video
                  src={item.url}
                  controls
                  autoPlay={idx === index}
                  playsInline
                  className="max-w-full max-h-[82vh] rounded-2xl object-contain shadow-2xl pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.url}
                  alt=""
                  draggable={false}
                  className="max-w-full max-h-[82vh] rounded-2xl object-contain shadow-2xl select-none pointer-events-none"
                />
              )}
            </div>
          ))}
        </div>

        {/* Navigation Buttons (Desktop) */}
        {media.length > 1 && (
          <>
            <button
              type="button"
              disabled={index === 0}
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full items-center justify-center text-xl font-bold z-30 text-white shadow-2xl transition-transform hover:scale-110 active:scale-95 disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
              style={{ backgroundColor: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)" }}
              aria-label="Ảnh trước"
            >
              ‹
            </button>
            <button
              type="button"
              disabled={index === media.length - 1}
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full items-center justify-center text-xl font-bold z-30 text-white shadow-2xl transition-transform hover:scale-110 active:scale-95 disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
              style={{ backgroundColor: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)" }}
              aria-label="Ảnh tiếp theo"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      {media.length > 1 && (
        <div
          className="relative z-30 flex items-center justify-center gap-1.5 pb-5 pt-2 px-4 flex-shrink-0 transition-opacity"
          style={{ opacity: backdropOpacity }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full max-w-full overflow-x-auto shadow-2xl"
            style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)" }}
          >
            {media.map((item, i) => {
              const active = i === index;
              return (
                <button
                  key={item.id || `${item.url}-${i}`}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`relative rounded-md overflow-hidden transition-all flex-shrink-0 cursor-pointer ${
                    active
                      ? "w-9 h-9 ring-2 ring-[#6c63ff] scale-105 opacity-100"
                      : "w-7 h-7 opacity-50 hover:opacity-90"
                  }`}
                  aria-label={`Chuyển tới ảnh ${i + 1}`}
                >
                  {item.type === "video" ? (
                    <div className="w-full h-full bg-[#1a1d30] flex items-center justify-center text-[10px]">
                      🎬
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

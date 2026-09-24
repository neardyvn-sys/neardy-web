"use client";

import { useEffect, useRef, useState } from "react";

interface PostVideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  containerClassName?: string;
  style?: React.CSSProperties;
  maxHeight?: number | string;
  autoPlayOnScroll?: boolean;
  defaultMuted?: boolean;
  loop?: boolean;
  onMediaClick?: () => void;
  showProgress?: boolean;
}

export default function PostVideoPlayer({
  src,
  poster,
  className = "w-full object-cover",
  containerClassName = "",
  style,
  maxHeight,
  autoPlayOnScroll = true,
  defaultMuted = true,
  loop = true,
  onMediaClick,
  showProgress = true,
}: PostVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(defaultMuted);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [userManuallyPaused, setUserManuallyPaused] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(false);

  // IntersectionObserver to auto-play when >= 50% in viewport
  useEffect(() => {
    if (!autoPlayOnScroll) return;

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = videoRef.current;
          if (!video) return;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (!userManuallyPaused) {
              video.play().catch(() => {
                // Auto-play was prevented by browser policy (usually if unmuted)
              });
            }
          } else if (entry.intersectionRatio < 0.3) {
            video.pause();
            // Reset manual pause state when scrolled out so it can re-play when scrolled back
            setUserManuallyPaused(false);
          }
        });
      },
      {
        threshold: [0.1, 0.3, 0.5, 0.8],
      },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [autoPlayOnScroll, userManuallyPaused]);

  // Video event handlers
  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    setCurrentTime(video.currentTime);
    setProgress((video.currentTime / video.duration) * 100);
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
    }
  };

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      setUserManuallyPaused(false);
      video.play().catch(() => {});
    } else {
      setUserManuallyPaused(true);
      video.pause();
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const video = videoRef.current;
    const bar = e.currentTarget;
    if (!video || !video.duration) return;

    const rect = bar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    video.currentTime = ratio * video.duration;
  };

  const formatTime = (sec: number) => {
    if (!sec || Number.isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden group select-none bg-[#05060a] ${containerClassName}`}
      style={{ ...style, maxHeight }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onClick={() => {
        if (onMediaClick) {
          onMediaClick();
        } else {
          togglePlay();
        }
      }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        muted={isMuted}
        loop={loop}
        preload="metadata"
        className={`${className} cursor-pointer block`}
        style={{ maxHeight }}
        onPlay={handlePlay}
        onPause={handlePause}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
      />

      {/* Buffering Spinner */}
      {isBuffering && isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none z-10">
          <div className="w-9 h-9 border-3 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Center Play Button Overlay (shown when paused or hovered) */}
      {!isPlaying && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/35 z-10 transition-opacity cursor-pointer"
          onClick={togglePlay}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-transform hover:scale-110 active:scale-95"
            style={{
              backgroundColor: "rgba(108,99,255,0.88)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24" className="ml-1">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        </div>
      )}

      {/* Top Floating Badge (Video Tag) */}
      <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none">
        <span
          className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white/90 uppercase tracking-wider flex items-center gap-1 shadow-sm"
          style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
        >
          <span className="text-[11px]">🎬</span> Video
        </span>
      </div>

      {/* Bottom Controls Bar Overlay */}
      <div
        className={`absolute bottom-0 inset-x-0 z-20 pt-8 pb-2 px-3 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-200 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        {showProgress && duration > 0 && (
          <div
            className="w-full h-1.5 bg-white/20 hover:h-2 rounded-full mb-2 cursor-pointer transition-all relative overflow-hidden"
            onClick={handleSeek}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #6c63ff 0%, #8b5cf6 100%)",
              }}
            />
          </div>
        )}

        <div className="flex items-center justify-between text-white text-xs">
          {/* Left: Play/Pause button + Timer */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-black/40 hover:bg-black/70 text-white transition-all shadow active:scale-95"
              aria-label={isPlaying ? "Tạm dừng" : "Phát"}
              title={isPlaying ? "Tạm dừng" : "Phát"}
            >
              {isPlaying ? (
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" className="ml-0.5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
            </button>

            {duration > 0 && (
              <span className="text-[11px] font-medium text-white/80 tabular-nums select-none">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            )}
          </div>

          {/* Right: Mute/Unmute toggle + Expand */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMute}
              className="px-2.5 py-1 rounded-full flex items-center gap-1.5 bg-black/40 hover:bg-black/70 text-white text-[11px] font-medium transition-all shadow active:scale-95"
              aria-label={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
              title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
            >
              {isMuted ? (
                <>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                  <span className="hidden sm:inline text-[10px]">Tắt âm</span>
                </>
              ) : (
                <>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                  <span className="hidden sm:inline text-[10px]">Bật âm</span>
                </>
              )}
            </button>

            {onMediaClick && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMediaClick();
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-black/40 hover:bg-black/70 text-white transition-all shadow active:scale-95"
                aria-label="Xem toàn màn hình"
                title="Mở toàn màn hình"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

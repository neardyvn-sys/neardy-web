"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Avatar from "@/components/ui/Avatar";
import type { MediaErrorKind } from "@/lib/microphone";
import type { CallPeer, CallPhase, CallRole, CallType } from "@/lib/types";

const RING_SECONDS = 30;

function formatDuration(totalSec: number) {
  const m = Math.floor(totalSec / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(totalSec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function CallTypeBadge({ callType }: { callType: CallType }) {
  const isVideo = callType === "video";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
      style={{
        backgroundColor: isVideo ? "rgba(0,229,255,0.12)" : "rgba(108,99,255,0.12)",
        color: isVideo ? "#00e5ff" : "#9b94ff",
        border: `1px solid ${isVideo ? "rgba(0,229,255,0.25)" : "rgba(108,99,255,0.25)"}`,
      }}
    >
      {isVideo ? (
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" />
        </svg>
      ) : (
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      )}
      {isVideo ? "Cuộc gọi video" : "Cuộc gọi thoại"}
    </span>
  );
}

function ActionButton({
  label,
  onClick,
  variant,
  icon,
}: {
  label: string;
  onClick: () => void;
  variant: "accept" | "reject" | "neutral" | "muted";
  icon: ReactNode;
}) {
  const styles =
    variant === "accept"
      ? { bg: "linear-gradient(135deg, #22c55e, #16a34a)", shadow: "0 8px 24px rgba(34,197,94,0.35)", color: "#fff" }
      : variant === "reject"
        ? { bg: "linear-gradient(135deg, #ef4444, #dc2626)", shadow: "0 8px 24px rgba(239,68,68,0.35)", color: "#fff" }
        : variant === "muted"
          ? { bg: "#f87171", shadow: "none", color: "#fff" }
          : { bg: "#1a1d2e", shadow: "none", color: "#fff" };

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 group"
      aria-label={label}
    >
      <span
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-transform group-active:scale-95"
        style={{ background: styles.bg, boxShadow: styles.shadow, color: styles.color }}
      >
        {icon}
      </span>
      <span className="text-xs font-medium" style={{ color: "#a0a8c8" }}>
        {label}
      </span>
    </button>
  );
}

function MediaPermissionPanel({
  title,
  steps,
  onRetry,
  onEnd,
  endLabel = "Kết thúc",
  retryLabel = "Cho phép thiết bị",
}: {
  title: string;
  steps: string[];
  onRetry: () => void;
  onEnd: () => void;
  endLabel?: string;
  retryLabel?: string;
}) {
  return (
    <div
      className="mt-6 w-full rounded-2xl px-4 py-5 text-left"
      style={{
        backgroundColor: "rgba(239,68,68,0.08)",
        border: "1px solid rgba(239,68,68,0.25)",
      }}
    >
      <div className="flex items-start gap-3 mb-4">
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#f87171" }}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: "#fca5a5" }}>
            {title}
          </p>
          <p className="text-xs mt-1" style={{ color: "#6b74a0" }}>
            Làm theo các bước sau, rồi nhấn Thử lại
          </p>
        </div>
      </div>

      <ol className="space-y-2 mb-5 pl-1">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-2.5 text-xs leading-relaxed" style={{ color: "#a0a8c8" }}>
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
              style={{ backgroundColor: "#1a1d2e", color: "#9b94ff" }}
            >
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="flex-1 py-3 rounded-xl text-sm font-bold"
          style={{
            background: "linear-gradient(135deg, #6c63ff, #5b54e8)",
            color: "#fff",
            boxShadow: "0 4px 16px rgba(108,99,255,0.3)",
          }}
        >
          {retryLabel}
        </button>
        <button
          type="button"
          onClick={onEnd}
          className="flex-1 py-3 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: "#1a1d2e", color: "#a0a8c8", border: "1px solid #1e2240" }}
        >
          {endLabel}
        </button>
      </div>
    </div>
  );
}

function VideoStage({
  localStream,
  remoteStream,
  peer,
  cameraOff,
  muted,
  statusText,
}: {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peer: CallPeer;
  cameraOff: boolean;
  muted: boolean;
  statusText: string;
}) {
  const remoteRef = useRef<HTMLVideoElement>(null);
  const localRef = useRef<HTMLVideoElement>(null);
  const hasRemoteVideo = !!remoteStream?.getVideoTracks().some((t) => t.readyState === "live");
  const remoteVideoEnabled = !!remoteStream?.getVideoTracks().some((t) => t.enabled && t.readyState === "live");

  useEffect(() => {
    const el = remoteRef.current;
    if (!el) return;
    el.srcObject = remoteStream;
    if (remoteStream) void el.play().catch(() => {});
  }, [remoteStream]);

  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    el.srcObject = localStream;
    if (localStream) void el.play().catch(() => {});
  }, [localStream]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{
        backgroundColor: "#05070e",
        border: "1px solid #1e2240",
        aspectRatio: "9 / 16",
        maxHeight: "min(62vh, 520px)",
      }}
    >
      <video
        ref={remoteRef}
        autoPlay
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        style={{ opacity: remoteVideoEnabled ? 1 : 0 }}
      />

      {!remoteVideoEnabled && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4">
          <Avatar
            initials={peer.avatar}
            userId={peer.id}
            size="xl"
            photoUrl={peer.photoUrl}
          />
          <p className="text-sm font-medium" style={{ color: "#a0a8c8" }}>
            {hasRemoteVideo ? "Đối phương đã tắt camera" : "Đang chờ video…"}
          </p>
        </div>
      )}

      <div
        className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums"
        style={{ backgroundColor: "rgba(0,0,0,0.55)", color: "#e8eaf2" }}
      >
        {statusText}
      </div>

      {(muted || cameraOff) && (
        <div className="absolute right-3 top-3 flex gap-1.5">
          {muted && (
            <span
              className="rounded-full px-2 py-1 text-[10px] font-semibold"
              style={{ backgroundColor: "rgba(239,68,68,0.85)", color: "#fff" }}
            >
              Mic tắt
            </span>
          )}
          {cameraOff && (
            <span
              className="rounded-full px-2 py-1 text-[10px] font-semibold"
              style={{ backgroundColor: "rgba(0,0,0,0.55)", color: "#e8eaf2" }}
            >
              Cam tắt
            </span>
          )}
        </div>
      )}

      <div
        className="absolute bottom-3 right-3 overflow-hidden rounded-xl shadow-lg"
        style={{
          width: "28%",
          maxWidth: 140,
          aspectRatio: "3 / 4",
          backgroundColor: "#111320",
          border: "1px solid #2a3050",
        }}
      >
        <video
          ref={localRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
          style={{
            transform: "scaleX(-1)",
            opacity: localStream && !cameraOff ? 1 : 0,
          }}
        />
        {(!localStream || cameraOff) && (
          <div
            className="absolute inset-0 flex items-center justify-center text-[10px]"
            style={{ color: "#6b74a0" }}
          >
            {cameraOff ? "Cam tắt" : "Bạn"}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CallOverlay({
  phase,
  role: _role,
  callType,
  peer,
  elapsedSec,
  muted = false,
  cameraOff = false,
  connStatus = "idle",
  localStream = null,
  remoteStream = null,
  mediaError = null,
  mediaErrorMessage = null,
  mediaPermissionSteps = [],
  onAccept,
  onReject,
  onCancel,
  onEnd,
  onToggleMute,
  onToggleCamera,
  onRetryMedia,
}: {
  phase: CallPhase;
  role: CallRole | null;
  callType: CallType;
  peer: CallPeer;
  elapsedSec: number;
  muted?: boolean;
  cameraOff?: boolean;
  connStatus?: "idle" | "connecting" | "connected" | "failed";
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
  mediaError?: MediaErrorKind | null;
  mediaErrorMessage?: string | null;
  mediaPermissionSteps?: string[];
  onAccept: () => void;
  onReject: () => void;
  onCancel: () => void;
  onEnd: () => void;
  onToggleMute?: () => void;
  onToggleCamera?: () => void;
  onRetryMedia?: () => void;
}) {
  const ringing = phase === "outgoing" || phase === "incoming";
  const remaining = Math.max(0, RING_SECONDS - elapsedSec);
  const showMediaPanel = !!mediaError && mediaErrorMessage;
  const isVideo = callType === "video";
  const showVideoStage = isVideo && phase === "active" && !showMediaPanel;

  const statusText =
    showMediaPanel
      ? mediaErrorMessage
      : phase === "outgoing"
        ? "Đang gọi…"
        : phase === "incoming"
          ? "Cuộc gọi đến"
          : connStatus === "connected"
            ? formatDuration(elapsedSec)
            : connStatus === "failed"
              ? "Kết nối thất bại"
              : isVideo
                ? "Đang kết nối video…"
                : "Đang kết nối âm thanh…";

  const subtitle =
    showMediaPanel
      ? null
      : phase === "active"
        ? muted && cameraOff && isVideo
          ? "Mic và camera đang tắt"
          : muted
            ? "Micro đang tắt"
            : cameraOff && isVideo
              ? "Camera đang tắt"
              : connStatus === "connected"
                ? isVideo
                  ? "Video đang hoạt động"
                  : "Âm thanh đang hoạt động"
                : "Thiết lập WebRTC…"
        : phase === "incoming"
          ? isVideo
            ? "Khi chấp nhận, trình duyệt sẽ hỏi quyền camera và microphone"
            : "Khi chấp nhận, trình duyệt sẽ hỏi quyền microphone"
          : ringing
            ? `Tự động kết thúc sau ${remaining}s`
            : "";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ backgroundColor: "rgba(5,7,14,0.92)" }}
      role="dialog"
      aria-modal="true"
      aria-label={statusText || "Cuộc gọi"}
    >
      <div
        className="w-full sm:max-w-md sm:rounded-3xl flex flex-col items-center px-6 pt-10 pb-8 sm:pb-10 min-h-[100dvh] sm:min-h-0 justify-between sm:justify-start max-h-[100dvh] overflow-y-auto"
        style={{
          backgroundColor: "#0d0f1a",
          border: "1px solid #1e2240",
          boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
        }}
      >
        <div className="flex flex-col items-center text-center w-full">
          {!showVideoStage && (
            <div className="relative mb-6">
              {(ringing || (phase === "active" && connStatus === "connecting" && !showMediaPanel)) && (
                <>
                  <span
                    className="absolute inset-0 rounded-full animate-ping opacity-20"
                    style={{ backgroundColor: "#6c63ff", margin: "-12px" }}
                  />
                  <span
                    className="absolute inset-0 rounded-full animate-pulse opacity-30"
                    style={{ backgroundColor: "#6c63ff", margin: "-6px" }}
                  />
                </>
              )}
              <Avatar
                initials={peer.avatar}
                userId={peer.id}
                size="xl"
                photoUrl={peer.photoUrl}
                className="relative z-10"
              />
            </div>
          )}

          <h2 className="text-xl sm:text-2xl font-bold mb-2 truncate max-w-full px-2" style={{ color: "#e8eaf2" }}>
            {peer.name}
          </h2>

          {!showVideoStage && (
            <p
              className={`text-sm mb-3 tabular-nums px-2 ${showMediaPanel ? "text-[#fca5a5] font-medium" : ""}`}
              style={{ color: showMediaPanel ? undefined : "#6b74a0" }}
            >
              {statusText}
            </p>
          )}

          {!showMediaPanel && !showVideoStage && <CallTypeBadge callType={callType} />}

          {subtitle && !showVideoStage && (
            <p className="text-xs mt-4 px-4" style={{ color: "#3a4060" }}>
              {subtitle}
            </p>
          )}

          {showMediaPanel && (
            <MediaPermissionPanel
              title={mediaErrorMessage}
              steps={mediaPermissionSteps}
              onRetry={() => onRetryMedia?.()}
              onEnd={phase === "outgoing" ? onCancel : onEnd}
              endLabel={phase === "outgoing" ? "Huỷ cuộc gọi" : "Kết thúc cuộc gọi"}
              retryLabel={isVideo ? "Cho phép camera & mic" : "Cho phép microphone"}
            />
          )}

          {showVideoStage && (
            <div className="mt-2 w-full">
              <VideoStage
                localStream={localStream}
                remoteStream={remoteStream}
                peer={peer}
                cameraOff={cameraOff}
                muted={muted}
                statusText={statusText}
              />
            </div>
          )}

          {phase === "active" && !showMediaPanel && !isVideo && (
            <div
              className="mt-8 w-full rounded-2xl px-4 py-8 flex flex-col items-center gap-3"
              style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
            >
              <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#6b74a0" strokeWidth={1.5}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <p className="text-sm font-medium" style={{ color: "#a0a8c8" }}>
                {connStatus === "connected" ? "Đang nói chuyện" : "Kết nối peer…"}
              </p>
            </div>
          )}
        </div>

        {!showMediaPanel && (
          <div className="flex items-center justify-center gap-6 sm:gap-10 mt-8 w-full pb-safe flex-wrap">
            {phase === "incoming" && (
              <>
                <ActionButton
                  label="Từ chối"
                  variant="reject"
                  onClick={onReject}
                  icon={
                    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  }
                />
                <ActionButton
                  label="Chấp nhận"
                  variant="accept"
                  onClick={onAccept}
                  icon={
                    isVideo ? (
                      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <polygon points="23 7 16 12 23 17 23 7" />
                        <rect x="1" y="5" width="15" height="14" rx="2" />
                      </svg>
                    ) : (
                      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    )
                  }
                />
              </>
            )}

            {phase === "outgoing" && (
              <ActionButton
                label="Huỷ"
                variant="reject"
                onClick={onCancel}
                icon={
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                }
              />
            )}

            {phase === "active" && (
              <>
                <ActionButton
                  label={muted ? "Bật mic" : "Tắt mic"}
                  variant={muted ? "muted" : "neutral"}
                  onClick={() => onToggleMute?.()}
                  icon={
                    muted ? (
                      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <line x1="1" y1="1" x2="23" y2="23" />
                        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.12 1.5-.34 2.19" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                    ) : (
                      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                    )
                  }
                />
                {isVideo && (
                  <ActionButton
                    label={cameraOff ? "Bật cam" : "Tắt cam"}
                    variant={cameraOff ? "muted" : "neutral"}
                    onClick={() => onToggleCamera?.()}
                    icon={
                      cameraOff ? (
                        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <polygon points="23 7 16 12 23 17 23 7" />
                          <rect x="1" y="5" width="15" height="14" rx="2" />
                        </svg>
                      )
                    }
                  />
                )}
                <ActionButton
                  label="Kết thúc"
                  variant="reject"
                  onClick={onEnd}
                  icon={
                    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  }
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

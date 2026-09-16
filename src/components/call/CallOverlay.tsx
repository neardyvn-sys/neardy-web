"use client";

import type { ReactNode } from "react";
import Avatar from "@/components/ui/Avatar";
import type { CallPeer, CallPhase, CallRole, CallType } from "@/lib/types";

const RING_SECONDS = 30;

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
  variant: "accept" | "reject" | "neutral";
  icon: ReactNode;
}) {
  const styles =
    variant === "accept"
      ? { bg: "linear-gradient(135deg, #22c55e, #16a34a)", shadow: "0 8px 24px rgba(34,197,94,0.35)" }
      : variant === "reject"
        ? { bg: "linear-gradient(135deg, #ef4444, #dc2626)", shadow: "0 8px 24px rgba(239,68,68,0.35)" }
        : { bg: "#1a1d2e", shadow: "none" };

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 group"
      aria-label={label}
    >
      <span
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-transform group-active:scale-95"
        style={{ background: styles.bg, boxShadow: styles.shadow, color: "#fff" }}
      >
        {icon}
      </span>
      <span className="text-xs font-medium" style={{ color: "#a0a8c8" }}>
        {label}
      </span>
    </button>
  );
}

export default function CallOverlay({
  phase,
  role,
  callType,
  peer,
  elapsedSec,
  onAccept,
  onReject,
  onCancel,
  onEnd,
}: {
  phase: CallPhase;
  role: CallRole | null;
  callType: CallType;
  peer: CallPeer;
  elapsedSec: number;
  onAccept: () => void;
  onReject: () => void;
  onCancel: () => void;
  onEnd: () => void;
}) {
  const ringing = phase === "outgoing" || phase === "incoming";
  const remaining = Math.max(0, RING_SECONDS - elapsedSec);

  const statusText =
    phase === "outgoing"
      ? "Đang gọi…"
      : phase === "incoming"
        ? "Cuộc gọi đến"
        : "Đã kết nối";

  const subtitle =
    phase === "active"
      ? "WebRTC sẽ được bật ở phase tiếp theo"
      : ringing
        ? `Tự động kết thúc sau ${remaining}s`
        : "";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ backgroundColor: "rgba(5,7,14,0.92)" }}
      role="dialog"
      aria-modal="true"
      aria-label={statusText}
    >
      <div
        className="w-full sm:max-w-md sm:rounded-3xl flex flex-col items-center px-6 pt-10 pb-8 sm:pb-10 min-h-[100dvh] sm:min-h-0 justify-between sm:justify-start"
        style={{
          backgroundColor: "#0d0f1a",
          border: "1px solid #1e2240",
          boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
        }}
      >
        <div className="flex flex-col items-center text-center w-full">
          <div className="relative mb-6">
            {ringing && (
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

          <h2 className="text-xl sm:text-2xl font-bold mb-2 truncate max-w-full px-2" style={{ color: "#e8eaf2" }}>
            {peer.name}
          </h2>

          <p className="text-sm mb-3" style={{ color: "#6b74a0" }}>
            {statusText}
          </p>

          <CallTypeBadge callType={callType} />

          {subtitle && (
            <p className="text-xs mt-4 px-4" style={{ color: "#3a4060" }}>
              {subtitle}
            </p>
          )}

          {phase === "active" && (
            <div
              className="mt-8 w-full rounded-2xl px-4 py-8 flex flex-col items-center gap-3"
              style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
            >
              {callType === "video" ? (
                <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#6b74a0" strokeWidth={1.5}>
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" />
                </svg>
              ) : (
                <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#6b74a0" strokeWidth={1.5}>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              )}
              <p className="text-sm font-medium" style={{ color: "#a0a8c8" }}>
                Cuộc gọi đang hoạt động
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-10 sm:gap-14 mt-10 w-full pb-safe">
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
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
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
          )}
        </div>
      </div>
    </div>
  );
}

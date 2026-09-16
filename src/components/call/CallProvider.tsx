"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import CallOverlay from "@/components/call/CallOverlay";
import { useApp } from "@/components/providers/AppProvider";
import { presenceApi, usersApi, type MeProfile } from "@/lib/api";
import {
  initialsFromName,
  type CallPeer,
  type CallPhase,
  type CallRole,
  type CallType,
} from "@/lib/types";

const RING_MS = 30_000;

type ChatWsPayload = Record<string, unknown>;

interface ActiveCall {
  phase: CallPhase;
  callId: string;
  conversationId: string;
  callType: CallType;
  role: CallRole;
  peer: CallPeer;
  startedAt: number;
}

interface CallContextValue {
  phase: CallPhase;
  callType: CallType | null;
  peer: CallPeer | null;
  role: CallRole | null;
  notice: string | null;
  clearNotice: () => void;
  startCall: (params: {
    conversationId: string;
    targetUserId: string;
    callType: CallType;
    peer: CallPeer;
  }) => Promise<boolean>;
  acceptCall: () => void;
  rejectCall: () => void;
  cancelCall: () => void;
  endCall: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

function profileToPeer(profile: MeProfile): CallPeer {
  const photo = profile.photos?.find((p) => p.is_primary) || profile.photos?.[0];
  return {
    id: profile.id,
    name: profile.display_name,
    avatar: initialsFromName(profile.display_name),
    photoUrl: photo?.url ?? null,
  };
}

function parseCallType(raw: unknown): CallType {
  return raw === "video" ? "video" : "audio";
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { user, chatWsReady, sendChatWs, subscribeChatWs } = useApp();
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [pendingOutgoing, setPendingOutgoing] = useState<{
    conversationId: string;
    targetUserId: string;
    callType: CallType;
    peer: CallPeer;
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const callRef = useRef<ActiveCall | null>(null);
  const pendingRef = useRef(pendingOutgoing);
  const ringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  callRef.current = call;
  pendingRef.current = pendingOutgoing;

  const clearRingTimer = useCallback(() => {
    if (ringTimerRef.current) {
      clearTimeout(ringTimerRef.current);
      ringTimerRef.current = null;
    }
  }, []);

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    setElapsedSec(0);
  }, []);

  const resetCall = useCallback(
    (message?: string) => {
      clearRingTimer();
      clearTick();
      setPendingOutgoing(null);
      setCall(null);
      if (message) setNotice(message);
    },
    [clearRingTimer, clearTick],
  );

  const sendSignaling = useCallback(
    (payload: ChatWsPayload) => {
      if (!sendChatWs(payload)) {
        setNotice("Mất kết nối realtime");
        return false;
      }
      return true;
    },
    [sendChatWs],
  );

  const scheduleRingTimeout = useCallback(() => {
    clearRingTimer();
    ringTimerRef.current = setTimeout(() => {
      const current = callRef.current;
      if (!current || current.phase === "active") return;
      if (current.role === "caller") {
        sendSignaling({
          type: "call.cancel",
          call_id: current.callId,
          conversation_id: current.conversationId,
          target_user_id: current.peer.id,
        });
        resetCall("Không có phản hồi");
      } else {
        resetCall();
      }
    }, RING_MS);
  }, [clearRingTimer, resetCall, sendSignaling]);

  useEffect(() => {
    if (!call || (call.phase !== "outgoing" && call.phase !== "incoming")) {
      clearRingTimer();
      clearTick();
      return;
    }

    scheduleRingTimeout();
    setElapsedSec(0);
    tickRef.current = setInterval(() => {
      const startedAt = callRef.current?.startedAt;
      if (!startedAt) return;
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => {
      clearRingTimer();
      clearTick();
    };
  }, [call?.callId, call?.phase, scheduleRingTimeout, clearRingTimer, clearTick]);

  const loadPeer = useCallback(async (userId: string): Promise<CallPeer> => {
    const profile = await usersApi.get(userId);
    return profileToPeer(profile);
  }, []);

  useEffect(() => {
    if (!user) {
      resetCall();
      return;
    }

    const unsubscribe = subscribeChatWs((msg) => {
      const type = String(msg.type || "");
      const myId = user.id;

      if (type === "error" && pendingRef.current) {
        resetCall(String(msg.error || "Không thể bắt đầu cuộc gọi"));
        return;
      }

      if (type === "call.ringing") {
        const pending = pendingRef.current;
        if (!pending) return;
        const callId = String(msg.call_id || "");
        if (!callId) return;
        setPendingOutgoing(null);
        setCall({
          phase: "outgoing",
          callId,
          conversationId: String(msg.conversation_id || pending.conversationId),
          callType: parseCallType(msg.call_type || pending.callType),
          role: "caller",
          peer: pending.peer,
          startedAt: Date.now(),
        });
        return;
      }

      if (type === "call.invite") {
        const fromUserId = String(msg.from_user_id || "");
        if (!fromUserId || fromUserId === myId) return;
        if (callRef.current) return;

        const callId = String(msg.call_id || "");
        const conversationId = String(msg.conversation_id || "");
        if (!callId || !conversationId) return;

        void (async () => {
          let peer: CallPeer;
          try {
            peer = await loadPeer(fromUserId);
          } catch {
            peer = {
              id: fromUserId,
              name: "Người gọi",
              avatar: "?",
            };
          }
          setCall({
            phase: "incoming",
            callId,
            conversationId,
            callType: parseCallType(msg.call_type),
            role: "callee",
            peer,
            startedAt: Date.now(),
          });
        })();
        return;
      }

      const callId = String(msg.call_id || "");
      const current = callRef.current;
      if (!current || !callId || current.callId !== callId) return;

      if (type === "call.accept") {
        if (current.role === "caller") {
          setCall((prev) => (prev ? { ...prev, phase: "active" } : prev));
        }
        return;
      }

      if (type === "call.reject") {
        resetCall(current.role === "caller" ? `${current.peer.name} đã từ chối` : undefined);
        return;
      }

      if (type === "call.cancel") {
        resetCall(current.role === "callee" ? "Cuộc gọi đã bị huỷ" : undefined);
        return;
      }

      if (type === "call.end") {
        resetCall("Cuộc gọi đã kết thúc");
      }
    });

    return unsubscribe;
  }, [user, subscribeChatWs, loadPeer, resetCall]);

  const startCall = useCallback(
    async (params: {
      conversationId: string;
      targetUserId: string;
      callType: CallType;
      peer: CallPeer;
    }) => {
      if (!user) return false;
      if (callRef.current || pendingRef.current) {
        setNotice("Đang trong cuộc gọi khác");
        return false;
      }
      if (!chatWsReady) {
        setNotice("Đang kết nối… Vui lòng thử lại");
        return false;
      }

      try {
        const presence = await presenceApi.get(params.targetUserId);
        if (!presence.online) {
          setNotice(`${params.peer.name} đang offline`);
          return false;
        }
      } catch {
        setNotice("Không kiểm tra được trạng thái online");
        return false;
      }

      setPendingOutgoing(params);
      const ok = sendSignaling({
        type: "call.invite",
        conversation_id: params.conversationId,
        target_user_id: params.targetUserId,
        call_type: params.callType,
      });
      if (!ok) {
        setPendingOutgoing(null);
        return false;
      }
      return true;
    },
    [user, chatWsReady, sendSignaling],
  );

  const acceptCall = useCallback(() => {
    const current = callRef.current;
    if (!current || current.phase !== "incoming") return;
    const ok = sendSignaling({
      type: "call.accept",
      call_id: current.callId,
      conversation_id: current.conversationId,
      target_user_id: current.peer.id,
    });
    if (ok) {
      setCall({ ...current, phase: "active" });
    }
  }, [sendSignaling]);

  const rejectCall = useCallback(() => {
    const current = callRef.current;
    if (!current || current.phase !== "incoming") return;
    sendSignaling({
      type: "call.reject",
      call_id: current.callId,
      conversation_id: current.conversationId,
      target_user_id: current.peer.id,
    });
    resetCall();
  }, [resetCall, sendSignaling]);

  const cancelCall = useCallback(() => {
    const current = callRef.current;
    const pending = pendingRef.current;
    if (current?.phase === "outgoing") {
      sendSignaling({
        type: "call.cancel",
        call_id: current.callId,
        conversation_id: current.conversationId,
        target_user_id: current.peer.id,
      });
      resetCall();
      return;
    }
    if (pending) {
      resetCall();
    }
  }, [resetCall, sendSignaling]);

  const endCall = useCallback(() => {
    const current = callRef.current;
    if (!current || current.phase !== "active") return;
    sendSignaling({
      type: "call.end",
      call_id: current.callId,
      conversation_id: current.conversationId,
      target_user_id: current.peer.id,
    });
    resetCall();
  }, [resetCall, sendSignaling]);

  const value = useMemo<CallContextValue>(
    () => ({
      phase: call?.phase ?? "idle",
      callType: call?.callType ?? null,
      peer: call?.peer ?? null,
      role: call?.role ?? null,
      notice,
      clearNotice: () => setNotice(null),
      startCall,
      acceptCall,
      rejectCall,
      cancelCall,
      endCall,
    }),
    [call, notice, startCall, acceptCall, rejectCall, cancelCall, endCall],
  );

  const overlayPeer = call?.peer ?? pendingOutgoing?.peer;
  const overlayCallType = call?.callType ?? pendingOutgoing?.callType;

  return (
    <CallContext.Provider value={value}>
      {children}
      {overlayPeer && overlayCallType && (call || pendingOutgoing) && (
        <CallOverlay
          phase={call?.phase ?? "outgoing"}
          role={call?.role ?? "caller"}
          callType={overlayCallType}
          peer={overlayPeer}
          elapsedSec={elapsedSec}
          onAccept={acceptCall}
          onReject={rejectCall}
          onCancel={cancelCall}
          onEnd={endCall}
        />
      )}
      {notice && !call && !pendingOutgoing && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[90] max-w-sm w-[calc(100%-2rem)]">
          <div
            className="rounded-2xl px-4 py-3 text-sm flex items-start gap-3 shadow-lg"
            style={{ backgroundColor: "#161929", border: "1px solid #1e2240", color: "#e8eaf2" }}
          >
            <span className="flex-1">{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-xs flex-shrink-0"
              style={{ color: "#6b74a0" }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}

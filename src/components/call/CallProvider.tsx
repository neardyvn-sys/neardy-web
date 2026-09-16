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
import { callsApi, presenceApi, usersApi, type MeProfile } from "@/lib/api";
import {
  initialsFromName,
  type CallPeer,
  type CallPhase,
  type CallRole,
  type CallType,
} from "@/lib/types";
import {
  classifyMicError,
  micErrorMessage,
  micPermissionSteps,
  prefetchMicrophone,
  type MicErrorKind,
} from "@/lib/microphone";
import { AudioCallSession } from "@/lib/webrtcAudio";

const RING_MS = 30_000;
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

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

type ConnStatus = "idle" | "connecting" | "connected" | "failed";

interface CallContextValue {
  phase: CallPhase;
  callType: CallType | null;
  peer: CallPeer | null;
  role: CallRole | null;
  muted: boolean;
  connStatus: ConnStatus;
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
  toggleMute: () => void;
  micError: MicErrorKind | null;
  retryMicrophone: () => void;
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

function toRtcIceServers(servers: { urls: string | string[]; username?: string; credential?: string }[]): RTCIceServer[] {
  return servers
    .filter((s) => s.urls && (Array.isArray(s.urls) ? s.urls.length > 0 : true))
    .map((s) => ({
      urls: s.urls,
      username: s.username,
      credential: s.credential,
    }));
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
  const [muted, setMuted] = useState(false);
  const [connStatus, setConnStatus] = useState<ConnStatus>("idle");
  const [micError, setMicError] = useState<MicErrorKind | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const callRef = useRef<ActiveCall | null>(null);
  const pendingRef = useRef(pendingOutgoing);
  const ringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef = useRef<AudioCallSession | null>(null);
  const sessionReadyRef = useRef<Promise<AudioCallSession | null> | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const endingRef = useRef(false);

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

  const cleanupWebRTC = useCallback(() => {
    sessionReadyRef.current = null;
    if (sessionRef.current) {
      sessionRef.current.cleanup();
      sessionRef.current = null;
    }
    setRemoteStream(null);
    setMuted(false);
    setConnStatus("idle");
    setMicError(null);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
  }, []);

  const resetCall = useCallback(
    (message?: string) => {
      endingRef.current = false;
      clearRingTimer();
      clearTick();
      cleanupWebRTC();
      setPendingOutgoing(null);
      setCall(null);
      if (message) setNotice(message);
    },
    [clearRingTimer, clearTick, cleanupWebRTC],
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

  const handleMicFailure = useCallback((err: unknown) => {
    const kind = classifyMicError(err);
    setMicError(kind);
    setConnStatus("failed");
    sessionReadyRef.current = null;
    if (sessionRef.current) {
      sessionRef.current.cleanup();
      sessionRef.current = null;
    }
  }, []);

  const hangupAndReset = useCallback(
    (message?: string, notifyPeer = true) => {
      if (endingRef.current) {
        resetCall(message);
        return;
      }
      endingRef.current = true;
      const current = callRef.current;
      if (notifyPeer && current) {
        sendSignaling({
          type: "call.end",
          call_id: current.callId,
          conversation_id: current.conversationId,
          target_user_id: current.peer.id,
        });
      }
      resetCall(message);
    },
    [resetCall, sendSignaling],
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
      if (call?.phase !== "active") clearTick();
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

  // Active call duration ticker
  useEffect(() => {
    if (!call || call.phase !== "active") return;
    clearRingTimer();
    setElapsedSec(0);
    const startedAt = Date.now();
    tickRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearTick();
  }, [call?.callId, call?.phase, clearRingTimer, clearTick]);

  useEffect(() => {
    const el = remoteAudioRef.current;
    if (!el) return;
    el.srcObject = remoteStream;
    if (remoteStream) {
      void el.play().catch(() => {
        // Autoplay may require a prior user gesture; accept/start already provides one.
      });
    }
  }, [remoteStream]);

  const loadIceServers = useCallback(async (): Promise<RTCIceServer[]> => {
    try {
      const cfg = await callsApi.iceConfig();
      const servers = toRtcIceServers(cfg.ice_servers || []);
      return servers.length > 0 ? servers : DEFAULT_ICE_SERVERS;
    } catch {
      return DEFAULT_ICE_SERVERS;
    }
  }, []);

  const ensureWebRTC = useCallback(
    async (asOfferer: boolean): Promise<AudioCallSession | null> => {
      const current = callRef.current;
      if (!current || current.phase !== "active") return null;
      if (sessionRef.current) return sessionRef.current;
      if (sessionReadyRef.current) {
        const existing = await sessionReadyRef.current;
        if (existing && asOfferer) {
          // Already created as answerer; offerer path shouldn't create a second offer here.
        }
        return existing;
      }

      const callId = current.callId;
      let ready!: Promise<AudioCallSession | null>;
      ready = (async (): Promise<AudioCallSession | null> => {
        setConnStatus("connecting");
        const session = new AudioCallSession({
          onIceCandidate: (candidate) => {
            const c = callRef.current;
            if (!c) return;
            sendSignaling({
              type: "webrtc.ice",
              call_id: c.callId,
              conversation_id: c.conversationId,
              target_user_id: c.peer.id,
              candidate,
            });
          },
          onRemoteStream: (stream) => setRemoteStream(stream),
          onConnectionState: (state) => {
            if (state === "connected") {
              setConnStatus("connected");
            } else if (state === "connecting") {
              setConnStatus("connecting");
            } else if (state === "failed") {
              setConnStatus("failed");
            } else if (state === "disconnected") {
              setConnStatus("connecting");
            }
          },
          onError: (code) => {
            if (code === "connection_failed") {
              hangupAndReset("Kết nối cuộc gọi thất bại", true);
            }
          },
        });

        try {
          setMicError(null);
          const iceServers = await loadIceServers();
          await session.start(iceServers);
          if (callRef.current?.callId !== callId) {
            session.cleanup();
            return null;
          }
          sessionRef.current = session;

          if (asOfferer) {
            const sdp = await session.createOffer();
            sendSignaling({
              type: "webrtc.offer",
              call_id: current.callId,
              conversation_id: current.conversationId,
              target_user_id: current.peer.id,
              sdp,
            });
          }
          return session;
        } catch (err) {
          session.cleanup();
          if (sessionRef.current === session) sessionRef.current = null;
          handleMicFailure(err);
          return null;
        } finally {
          if (sessionReadyRef.current === ready) {
            sessionReadyRef.current = null;
          }
        }
      })();

      sessionReadyRef.current = ready;
      return ready;
    },
    [hangupAndReset, handleMicFailure, loadIceServers, sendSignaling],
  );

  const retryMicrophone = useCallback(() => {
    const current = callRef.current;
    if (!current || current.phase !== "active") return;
    cleanupWebRTC();
    void ensureWebRTC(current.role === "caller");
  }, [cleanupWebRTC, ensureWebRTC]);

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
          const next = { ...current, phase: "active" as const, startedAt: Date.now() };
          callRef.current = next;
          setCall(next);
          void ensureWebRTC(true);
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
        endingRef.current = true;
        resetCall("Cuộc gọi đã kết thúc");
        return;
      }

      if (type === "webrtc.offer") {
        const sdp = String(msg.sdp || "");
        if (!sdp) return;
        void (async () => {
          try {
            const session = await ensureWebRTC(false);
            if (!session) return;
            const answer = await session.handleOffer(sdp);
            const c = callRef.current;
            if (!c) return;
            sendSignaling({
              type: "webrtc.answer",
              call_id: c.callId,
              conversation_id: c.conversationId,
              target_user_id: c.peer.id,
              sdp: answer,
            });
          } catch (err) {
            handleMicFailure(err);
          }
        })();
        return;
      }

      if (type === "webrtc.answer") {
        const sdp = String(msg.sdp || "");
        if (!sdp) return;
        void (async () => {
          const session = sessionRef.current || (await sessionReadyRef.current);
          if (!session) return;
          try {
            await session.handleAnswer(sdp);
          } catch {
            hangupAndReset("Kết nối cuộc gọi thất bại", true);
          }
        })();
        return;
      }

      if (type === "webrtc.ice") {
        const raw = msg.candidate;
        if (!raw || typeof raw !== "object") return;
        const candidate = raw as {
          candidate?: string;
          sdpMid?: string | null;
          sdpMLineIndex?: number | null;
          usernameFragment?: string | null;
        };
        void (async () => {
          const session = sessionRef.current || (await sessionReadyRef.current);
          await session?.addIceCandidate({
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid ?? undefined,
            sdpMLineIndex: candidate.sdpMLineIndex ?? undefined,
            usernameFragment: candidate.usernameFragment ?? undefined,
          });
        })();
      }
    });

    return unsubscribe;
  }, [user, subscribeChatWs, loadPeer, resetCall, ensureWebRTC, sendSignaling, hangupAndReset, handleMicFailure]);

  // Prefetch mic permission while outgoing call is ringing.
  useEffect(() => {
    if (!call || call.phase !== "outgoing" || call.role !== "caller") return;
    void prefetchMicrophone().then((kind) => {
      if (kind) setMicError(kind);
    });
  }, [call?.callId, call?.phase, call?.role]);

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

      // Phase 5: audio WebRTC only (video call type still uses audio media).
      const callType: CallType = params.callType === "video" ? "video" : "audio";

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

      setPendingOutgoing({ ...params, callType });
      const ok = sendSignaling({
        type: "call.invite",
        conversation_id: params.conversationId,
        target_user_id: params.targetUserId,
        call_type: callType,
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
    if (!ok) return;
    const next = { ...current, phase: "active" as const, startedAt: Date.now() };
    callRef.current = next;
    setCall(next);
    // Callee prepares PC + mic; waits for webrtc.offer from caller.
    void ensureWebRTC(false);
  }, [sendSignaling, ensureWebRTC]);

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
    hangupAndReset(undefined, true);
  }, [hangupAndReset]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      sessionRef.current?.setMuted(next);
      return next;
    });
  }, []);

  const value = useMemo<CallContextValue>(
    () => ({
      phase: call?.phase ?? "idle",
      callType: call?.callType ?? null,
      peer: call?.peer ?? null,
      role: call?.role ?? null,
      muted,
      connStatus,
      notice,
      clearNotice: () => setNotice(null),
      startCall,
      acceptCall,
      rejectCall,
      cancelCall,
      endCall,
      toggleMute,
      micError,
      retryMicrophone,
    }),
    [call, muted, connStatus, micError, notice, startCall, acceptCall, rejectCall, cancelCall, endCall, toggleMute, retryMicrophone],
  );

  const overlayPeer = call?.peer ?? pendingOutgoing?.peer;
  const overlayCallType = call?.callType ?? pendingOutgoing?.callType;

  return (
    <CallContext.Provider value={value}>
      {children}
      {/* Remote audio playback element */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      {overlayPeer && overlayCallType && (call || pendingOutgoing) && (
        <CallOverlay
          phase={call?.phase ?? "outgoing"}
          role={call?.role ?? "caller"}
          callType={overlayCallType}
          peer={overlayPeer}
          elapsedSec={elapsedSec}
          muted={muted}
          connStatus={connStatus}
          micError={micError}
          micErrorMessage={micError ? micErrorMessage(micError) : null}
          micPermissionSteps={micError ? micPermissionSteps(micError) : []}
          onAccept={acceptCall}
          onReject={rejectCall}
          onCancel={cancelCall}
          onEnd={endCall}
          onToggleMute={toggleMute}
          onRetryMic={retryMicrophone}
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

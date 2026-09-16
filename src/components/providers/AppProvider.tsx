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
import { useRouter } from "next/navigation";
import type { AuthUser, MatchItem, NearbyFilters, NearbyUser, PermissionState } from "@/lib/types";
import { initialsFromName } from "@/lib/types";
import {
  FALLBACK_LOCATION,
  loadLocationSharing,
  saveLocationSharing,
} from "@/lib/locationPrefs";
import {
  authApi,
  clearTokens,
  feedApi,
  getAccessToken,
  likesApi,
  meApi,
  nearbyApi,
  setTokens,
  wsUrl,
  type MeProfile,
} from "@/lib/api";

type ChatWsPayload = Record<string, unknown>;
type ChatWsListener = (msg: ChatWsPayload) => void;

interface AppContextValue {
  user: AuthUser | null;
  ready: boolean;
  users: NearbyUser[];
  matches: MatchItem[];
  permissionState: PermissionState;
  locationSharing: boolean;
  locationBusy: boolean;
  setLocationSharing: (on: boolean) => Promise<void>;
  requestLocation: () => Promise<void>;
  friends: Set<string>;
  chatWsReady: boolean;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  sendChatWs: (payload: ChatWsPayload) => boolean;
  subscribeChatWs: (listener: ChatWsListener) => () => void;
  refreshNearby: (filters?: NearbyFilters) => Promise<void>;
  refreshMatches: () => Promise<void>;
  loginWithPassword: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  toggleFriend: (id: string) => Promise<{ conversationId?: string; matched: boolean }>;
  passUser: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function profileToAuth(p: MeProfile): AuthUser {
  return {
    id: p.id,
    name: p.display_name,
    email: p.email,
    avatar: initialsFromName(p.display_name),
    bio: p.bio || undefined,
    onboardingCompleted: p.onboarding_completed,
  };
}

async function ensureOnboarded(profile: MeProfile) {
  if (profile.onboarding_completed && profile.birth_date && profile.gender) return profile;
  return meApi.patch({
    birth_date: profile.birth_date || "1998-01-01",
    gender: profile.gender || "nonbinary",
    looking_for:
      profile.looking_for?.length > 0 ? profile.looking_for : ["woman", "man", "nonbinary"],
    onboarding_completed: true,
    bio: profile.bio || "Xin chào, mình mới tham gia Neardy!",
  });
}

function previewFromWsMessage(m: {
  type?: string;
  body?: string | null;
  deleted_at?: string | null;
  recalled?: boolean;
}) {
  if (m.recalled || m.deleted_at) return "Tin nhắn đã được thu hồi";
  switch (m.type) {
    case "image":
      return "📷 Ảnh";
    case "video":
      return "🎬 Video";
    case "emoji":
      return m.body || "Emoji";
    default:
      return m.body || "Tin nhắn mới";
  }
}

function mapMatches(
  data: Awaited<ReturnType<typeof likesApi.matches>>,
): MatchItem[] {
  return data.matches.map((m) => ({
    matchId: m.match_id,
    conversationId: m.conversation_id,
    userId: m.user_id,
    displayName: m.display_name,
    primaryPhoto: m.primary_photo,
    lastMessage: m.last_message || undefined,
    lastMessageAt: m.last_message_at || undefined,
    unread: m.unread_count || 0,
  }));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [users, setUsers] = useState<NearbyUser[]>([]);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [permissionState, setPermissionState] = useState<PermissionState>("loading");
  const [locationSharing, setLocationSharingState] = useState(true);
  const [locationBusy, setLocationBusy] = useState(false);
  const [friends, setFriends] = useState<Set<string>>(new Set());
  const [chatWsReady, setChatWsReady] = useState(false);
  const [activeConversationId, setActiveConversationIdState] = useState<string | null>(null);
  const router = useRouter();

  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef(new Set<ChatWsListener>());
  const userIdRef = useRef<string | null>(null);
  const activeConvRef = useRef<string | null>(null);
  const refreshMatchesRef = useRef<() => Promise<void>>(async () => {});

  userIdRef.current = user?.id ?? null;
  activeConvRef.current = activeConversationId;

  const setActiveConversationId = useCallback((id: string | null) => {
    activeConvRef.current = id;
    setActiveConversationIdState(id);
    if (id) {
      setMatches((prev) =>
        prev.map((m) => (m.conversationId === id ? { ...m, unread: 0 } : m)),
      );
    }
  }, []);

  const refreshMatches = useCallback(async () => {
    const data = await likesApi.matches();
    const items = mapMatches(data);
    setMatches(items);
    setFriends(new Set(items.map((m) => m.userId)));
  }, []);

  refreshMatchesRef.current = refreshMatches;

  const refreshNearby = useCallback(async (filters?: NearbyFilters) => {
    try {
      const data = await nearbyApi.list(
        filters
          ? {
              min_age: filters.minAge,
              max_age: filters.maxAge,
              max_distance_km: filters.maxDistanceKm,
              gender: filters.genders?.length ? filters.genders.join(",") : undefined,
            }
          : undefined,
      );
      setUsers(
        data.users.map((u) => ({
          id: u.id,
          name: u.display_name,
          avatar: initialsFromName(u.display_name),
          status: u.bio || "Đang ở gần bạn",
          distanceKm: u.distance_km,
          online: u.show_online !== false,
          bio: u.bio || "",
          age: u.age ?? undefined,
          gender: u.gender,
          photoUrl: u.primary_photo,
        })),
      );
    } catch (e) {
      setUsers([]);
      console.warn("nearby", e);
    }
  }, []);

  useEffect(() => {
    setLocationSharingState(loadLocationSharing());
  }, []);

  const applyLoc = useCallback(
    async (lat: number, lng: number) => {
      await meApi.setLocation(lat, lng);
      await refreshNearby();
      await refreshMatches();
    },
    [refreshMatches, refreshNearby],
  );

  const syncLocation = useCallback(
    async (sharingOverride?: boolean) => {
      const sharing = sharingOverride ?? loadLocationSharing();

      if (!sharing) {
        try {
          if (typeof navigator !== "undefined" && navigator.permissions?.query) {
            const status = await navigator.permissions.query({ name: "geolocation" });
            setPermissionState(status.state === "granted" ? "granted" : "denied");
          } else {
            setPermissionState((prev) => (prev === "loading" ? "denied" : prev));
          }
        } catch {
          setPermissionState((prev) => (prev === "loading" ? "denied" : prev));
        }
        await applyLoc(FALLBACK_LOCATION.lat, FALLBACK_LOCATION.lng);
        return;
      }
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setPermissionState("denied");
        await applyLoc(FALLBACK_LOCATION.lat, FALLBACK_LOCATION.lng);
        return;
      }
      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            setPermissionState("granted");
            try {
              await applyLoc(pos.coords.latitude, pos.coords.longitude);
            } catch (err) {
              console.warn(err);
            }
            resolve();
          },
          async () => {
            setPermissionState("denied");
            try {
              await applyLoc(FALLBACK_LOCATION.lat, FALLBACK_LOCATION.lng);
            } catch (err) {
              console.warn(err);
            }
            resolve();
          },
          { enableHighAccuracy: true, timeout: 8000 },
        );
      });
    },
    [applyLoc],
  );

  const requestLocation = useCallback(async () => {
    setLocationBusy(true);
    try {
      await syncLocation(true);
    } finally {
      setLocationBusy(false);
    }
  }, [syncLocation]);

  const setLocationSharing = useCallback(
    async (on: boolean) => {
      saveLocationSharing(on);
      setLocationSharingState(on);
      setLocationBusy(true);
      try {
        await syncLocation(on);
      } finally {
        setLocationBusy(false);
      }
    },
    [syncLocation],
  );

  const applyInboxEvent = useCallback((msg: ChatWsPayload) => {
    const type = String(msg.type || "");
    if (type === "message.new") {
      const m = (msg.message as Record<string, unknown>) || msg;
      const conversationId = String(m.conversation_id || "");
      if (!conversationId) return;
      const senderId = String(m.sender_id || "");
      const fromMe = senderId === userIdRef.current;
      const isActive = activeConvRef.current === conversationId;
      const preview = previewFromWsMessage({
        type: String(m.type || "text"),
        body: (m.body as string) || null,
      });
      const createdAt = String(m.created_at || new Date().toISOString());

      setMatches((prev) => {
        const idx = prev.findIndex((x) => x.conversationId === conversationId);
        if (idx < 0) {
          void refreshMatchesRef.current();
          return prev;
        }
        const next = [...prev];
        const item = { ...next[idx] };
        item.lastMessage = preview;
        item.lastMessageAt = createdAt;
        if (!fromMe && !isActive) {
          item.unread = (item.unread || 0) + 1;
        } else if (isActive) {
          item.unread = 0;
        }
        next.splice(idx, 1);
        next.unshift(item);
        return next;
      });
      return;
    }

    if (type === "message.read") {
      const conversationId = String(msg.conversation_id || "");
      const readerId = String(msg.user_id || "");
      if (!conversationId || readerId !== userIdRef.current) return;
      setMatches((prev) =>
        prev.map((m) => (m.conversationId === conversationId ? { ...m, unread: 0 } : m)),
      );
      return;
    }

    if (type === "message.recalled" || type === "message.hidden") {
      void refreshMatchesRef.current();
    }
  }, []);

  const sendChatWs = useCallback((payload: ChatWsPayload) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(payload));
    return true;
  }, []);

  const subscribeChatWs = useCallback((listener: ChatWsListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setChatWsReady(false);
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }

    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (closed) return;
      const ws = new WebSocket(wsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        if (closed) return;
        setChatWsReady(true);
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as ChatWsPayload;
          applyInboxEvent(msg);
          listenersRef.current.forEach((fn) => fn(msg));
        } catch {
          // ignore malformed
        }
      };

      ws.onclose = () => {
        setChatWsReady(false);
        wsRef.current = null;
        if (!closed) {
          reconnectTimer = setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      setChatWsReady(false);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [user?.id, applyInboxEvent]);

  const bootstrapSession = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      setReady(true);
      return;
    }
    try {
      let profile = await meApi.get();
      profile = await ensureOnboarded(profile);
      setUser(profileToAuth(profile));
      await syncLocation();
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setReady(true);
    }
  }, [syncLocation]);

  useEffect(() => {
    void bootstrapSession();
  }, [bootstrapSession]);

  const loginWithPassword = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const tokens = displayName
        ? await authApi.register({ email, password, display_name: displayName })
        : await authApi.login({ email, password });
      setTokens(tokens.access_token, tokens.refresh_token);
      let profile = await meApi.get();
      profile = await ensureOnboarded(profile);
      setUser(profileToAuth(profile));
      setReady(true);
      await syncLocation();
      router.push("/nearby");
    },
    [router, syncLocation],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setUsers([]);
    setMatches([]);
    setFriends(new Set());
    setActiveConversationId(null);
    router.push("/");
  }, [router, setActiveConversationId]);

  const toggleFriend = useCallback(
    async (id: string) => {
      if (friends.has(id)) {
        return { matched: true, conversationId: matches.find((m) => m.userId === id)?.conversationId };
      }
      const res = await likesApi.like(id, "like");
      await refreshMatches();
      return { matched: res.matched, conversationId: res.conversation_id };
    },
    [friends, matches, refreshMatches],
  );

  const passUser = useCallback(async (id: string) => {
    await likesApi.like(id, "pass");
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      users,
      matches,
      permissionState,
      locationSharing,
      locationBusy,
      setLocationSharing,
      requestLocation,
      friends,
      chatWsReady,
      activeConversationId,
      setActiveConversationId,
      sendChatWs,
      subscribeChatWs,
      refreshNearby,
      refreshMatches,
      loginWithPassword,
      logout,
      toggleFriend,
      passUser,
    }),
    [
      user,
      ready,
      users,
      matches,
      permissionState,
      locationSharing,
      locationBusy,
      setLocationSharing,
      requestLocation,
      friends,
      chatWsReady,
      activeConversationId,
      setActiveConversationId,
      sendChatWs,
      subscribeChatWs,
      refreshNearby,
      refreshMatches,
      loginWithPassword,
      logout,
      toggleFriend,
      passUser,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export { feedApi };
